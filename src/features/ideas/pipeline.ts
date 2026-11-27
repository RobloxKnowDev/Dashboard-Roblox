import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getClaude, IDEAS_MODEL } from "@/lib/ai/claude";
import { aiBlockReason, recordUsage } from "@/lib/ai/usage";
import { getRobloxGamesBatched } from "@/lib/integrations/roblox/public";
import { searchRobloxGames, type RobloxSearchHit } from "@/lib/integrations/roblox/search";
import { collectSteamCandidates, type SteamCandidate } from "@/lib/integrations/steam";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayOf, type CandidateRecord, type RobloxMatch } from "./weekly-types";

/**
 * Weekly game ideas, mainly from Steam (decided with the studio):
 *  1. collect trending Steam games (most played, top releases, popular new);
 *  2. Claude picks the ones that would adapt well to Roblox and writes the
 *     searches a Roblox player would type for each;
 *  3. the dashboard runs those searches on Roblox (live players, votes, visits);
 *  4. Claude judges, for each, whether it already exists on Roblox, and writes
 *     the top 5 ideas among those that don't (English + French).
 * Runs on Monday (Vercel Cron) or on demand (Owner). Every Claude request is
 * logged in ai_usage. Written with the secret key (RLS: members read only).
 */

const MAX_PICKS = 12;
const QUERIES_PER_PICK = 3;
const RESULTS_PER_QUERY = 6;

/* ───────────────────────────── Claude schemas ───────────────────────────── */

const PickSchema = z.object({
  picks: z.array(
    z.object({
      appId: z.number().int(),
      concept: z.string().describe("One sentence: the core loop that would work on Roblox"),
      queries: z.array(z.string()).describe("2–3 short searches a Roblox player would type to find such a game"),
    }),
  ),
});

const LocalizedIdea = z.object({
  title: z.string().describe("Original Roblox-style title — never the Steam game's name"),
  pitch: z.string(),
  genre: z.string().describe("Roblox genre, e.g. Obby, Simulator, Tycoon, Horror, Party"),
  targetAudience: z.string(),
  coreLoop: z.string().describe("Arrows between steps: Do X → earn Y → unlock Z"),
  monetization: z.string(),
  why: z.string().describe("Why now: the Steam traction and the gap on Roblox, with numbers"),
});

const VerdictSchema = z.object({
  verdicts: z.array(
    z.object({
      appId: z.number().int(),
      verdict: z.enum(["exists", "similar", "free"]),
      matchUniverseIds: z.array(z.number().int()).describe("Roblox games (universe ids from the search results) that already do this concept"),
      summaryEn: z.string(),
      summaryFr: z.string(),
    }),
  ),
  ideas: z.array(
    z.object({
      appId: z.number().int(),
      score: z.number().int().describe("0–100: potential on Roblox for a small studio"),
      en: LocalizedIdea,
      fr: LocalizedIdea,
    }),
  ),
});

/* ───────────────────────────── Steps ───────────────────────────── */

type Usage = { cost: number };

async function ask<T extends z.ZodType>(
  client: Anthropic,
  schema: T,
  system: string,
  prompt: string,
  usage: Usage,
  userId: string | null,
): Promise<z.infer<T>> {
  const response = await client.beta.messages.parse(
    {
      model: IDEAS_MODEL,
      max_tokens: 16000,
      // Refusals are unlikely here, but if one happens the request continues on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: 240_000 },
  );
  usage.cost += await recordUsage({ feature: "ideas", model: IDEAS_MODEL, usage: response.usage, userId });
  if (response.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (!response.parsed_output) throw new Error(`Claude's answer couldn't be read (stop reason: ${response.stop_reason})`);
  return response.parsed_output as z.infer<T>;
}

function describeCandidate(c: SteamCandidate) {
  return {
    appId: c.appId,
    name: c.name,
    description: c.description,
    genres: c.genres,
    multiplayer: c.categories,
    price: c.price,
    released: c.released,
    playingNow: c.currentPlayers,
    reviews: c.reviewCount,
    mostPlayedRank: c.mostPlayedRank,
    lastWeekRank: c.lastWeekRank,
    foundIn: c.sources,
  };
}

const SYSTEM = [
  "You are a game market analyst for a small Roblox studio (a few developers, players aged 9–16, sessions of 10–30 minutes, monetization with game passes and developer products).",
  "The studio adapts concepts that work on Steam into original Roblox games — like the Steam incremental cleaning games that became hits on Roblox.",
  "Judge with Roblox in mind: simple core loop readable in 10 seconds, social or co-op play, progression and upgrades, short sessions, low-poly friendly, works on phones.",
  "Avoid horror with gore, gambling, adult themes, licensed IP that can't be adapted, and games whose fun depends on complex physics, long stories or high-end graphics.",
  "Ideas must be original: never reuse a Steam game's name, characters, art or story — only the concept and mechanics.",
].join("\n");

async function pickCandidates(client: Anthropic, candidates: SteamCandidate[], usage: Usage, userId: string | null) {
  const result = await ask(
    client,
    PickSchema,
    SYSTEM,
    [
      `Here are ${candidates.length} games trending on Steam right now (JSON).`,
      `Pick at most ${MAX_PICKS} whose concept would make a strong Roblox game for this studio, best first.`,
      `For each, write ${QUERIES_PER_PICK} short Roblox searches (English, the words Roblox players type — e.g. the concept "clean the moon", "sweep simulator", "space cleaning") that would find an existing Roblox version of the concept.`,
      "",
      JSON.stringify(candidates.map(describeCandidate)),
    ].join("\n"),
    usage,
    userId,
  );
  const known = new Map(candidates.map((c) => [c.appId, c]));
  return result.picks
    .filter((p) => known.has(p.appId))
    .slice(0, MAX_PICKS)
    .map((p) => ({ ...p, queries: p.queries.map((q) => q.trim()).filter(Boolean).slice(0, QUERIES_PER_PICK), steam: known.get(p.appId)! }));
}

type Pick = Awaited<ReturnType<typeof pickCandidates>>[number];

/** Runs every pick's searches on Roblox (3 at a time) and adds lifetime visits. */
async function searchRoblox(picks: Pick[]) {
  const jobs = picks.flatMap((pick) => pick.queries.map((query) => ({ appId: pick.steam.appId, query })));
  const hitsByApp = new Map<number, Map<number, RobloxSearchHit>>();
  for (let i = 0; i < jobs.length; i += 3) {
    const batch = jobs.slice(i, i + 3);
    const results = await Promise.all(batch.map((job) => searchRobloxGames(job.query, RESULTS_PER_QUERY)));
    batch.forEach((job, index) => {
      const hits = hitsByApp.get(job.appId) ?? new Map<number, RobloxSearchHit>();
      for (const hit of results[index] ?? []) hits.set(hit.universeId, hit);
      hitsByApp.set(job.appId, hits);
    });
  }
  const allIds = [...new Set([...hitsByApp.values()].flatMap((hits) => [...hits.keys()]))];
  const info = (await getRobloxGamesBatched(allIds)) ?? new Map();
  const matchesOf = (appId: number): RobloxMatch[] =>
    [...(hitsByApp.get(appId)?.values() ?? [])]
      .map((hit) => ({ ...hit, visits: info.get(hit.universeId)?.visits ?? null }))
      .sort((a, b) => b.playing - a.playing);
  return matchesOf;
}

async function judge(client: Anthropic, picks: Pick[], matchesOf: (appId: number) => RobloxMatch[], usage: Usage, userId: string | null) {
  const payload = picks.map((pick) => ({
    steam: describeCandidate(pick.steam),
    concept: pick.concept,
    robloxSearches: pick.queries,
    robloxResults: matchesOf(pick.steam.appId).map((m) => ({
      universeId: m.universeId,
      name: m.name,
      playingNow: m.playing,
      lifetimeVisits: m.visits,
      likes: m.upVotes,
      dislikes: m.downVotes,
      description: m.description,
    })),
  }));
  return ask(
    client,
    VerdictSchema,
    SYSTEM,
    [
      "For each Steam game below you have the Roblox search results for its concept.",
      'Verdict per game: "exists" when an established Roblox game already does this concept (a close match with real traction: hundreds of players now or millions of visits);',
      '"similar" when only small, old or weak versions exist (a gap a better game can still take); "free" when nothing on Roblox does it.',
      "Give a one-sentence summary per verdict, in English (summaryEn) and in French (summaryFr, informal and natural), naming the closest Roblox game with its numbers when there is one.",
      'Then write the 5 best game ideas for the studio, ONLY from games judged "similar" or "free", best first (fewer than 5 if there aren\'t enough).',
      "Each idea in English (en) and in French (fr, natural French, same content), with an original title. Give a score from 0 to 100.",
      "",
      JSON.stringify(payload),
    ].join("\n"),
    usage,
    userId,
  );
}

/* ───────────────────────────── Run ───────────────────────────── */

/** Creates a run (status "running"), or explains why it can't start. */
export async function startIdeasRun(trigger: "cron" | "manual", userId: string | null, now: Date): Promise<{ runId: string } | { error: "not_configured" | "budget" | "already_running" | "failed" }> {
  const blocked = await aiBlockReason(now, "ideas");
  if (blocked === "not_configured" || blocked === "budget") return { error: blocked };
  const admin = createAdminClient();
  const recent = new Date(now.getTime() - 10 * 60_000).toISOString();
  const { data: running } = await admin.from("idea_runs").select("id").eq("status", "running").gte("created_at", recent).limit(1);
  if (running && running.length > 0) return { error: "already_running" };
  const { data, error } = await admin
    .from("idea_runs")
    .insert({ trigger, started_by: userId, week_of: mondayOf(now.toISOString().slice(0, 10)), model: IDEAS_MODEL })
    .select("id")
    .single();
  if (error || !data) return { error: "failed" };
  return { runId: data.id };
}

/** Does the whole generation for a run created by startIdeasRun. Never throws. */
export async function runIdeasPipeline(runId: string, userId: string | null, today: string): Promise<void> {
  const admin = createAdminClient();
  const usage: Usage = { cost: 0 };
  try {
    const client = getClaude();
    if (!client) throw new Error("ANTHROPIC_API_KEY is not set");

    const candidates = await collectSteamCandidates(today);
    if (candidates.length === 0) throw new Error("Steam couldn't be reached");

    const picks = await pickCandidates(client, candidates, usage, userId);
    if (picks.length === 0) throw new Error("No Steam game was picked");

    const matchesOf = await searchRoblox(picks);
    const result = await judge(client, picks, matchesOf, usage, userId);

    const byApp = new Map(picks.map((p) => [p.steam.appId, p]));
    const verdicts = new Map(result.verdicts.map((v) => [v.appId, v]));
    const candidateRecords: CandidateRecord[] = picks.map((pick) => {
      const v = verdicts.get(pick.steam.appId);
      const matches = matchesOf(pick.steam.appId);
      const chosen = new Set(v?.matchUniverseIds ?? []);
      return {
        steam: steamSummary(pick.steam),
        concept: pick.concept,
        queries: pick.queries,
        verdict: v?.verdict ?? "similar",
        summary: { en: v?.summaryEn ?? "", fr: v?.summaryFr ?? "" },
        matches: (chosen.size > 0 ? matches.filter((m) => chosen.has(m.universeId)) : matches).slice(0, 4),
      };
    });

    const ideas = result.ideas
      .filter((idea) => byApp.has(idea.appId) && verdicts.get(idea.appId)?.verdict !== "exists")
      .slice(0, 5)
      .map((idea, index) => {
        const record = candidateRecords.find((c) => c.steam.appId === idea.appId)!;
        return {
          run_id: runId,
          rank: index + 1,
          score: Math.max(0, Math.min(100, Math.round(idea.score))),
          steam: record.steam,
          content: { en: idea.en, fr: idea.fr },
          roblox_check: { verdict: record.verdict, summary: record.summary, queries: record.queries, closest: matchesOf(idea.appId).slice(0, 4) },
        };
      });

    if (ideas.length > 0) {
      const { error } = await admin.from("weekly_ideas").insert(ideas);
      if (error) throw new Error(`Ideas couldn't be saved: ${error.message}`);
    }
    await admin
      .from("idea_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString(), cost_usd: Number(usage.cost.toFixed(6)), candidates: candidateRecords })
      .eq("id", runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[ideas] run ${runId} failed:`, message);
    await admin
      .from("idea_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), cost_usd: Number(usage.cost.toFixed(6)), error: message.slice(0, 500) })
      .eq("id", runId);
  }
}

function steamSummary(c: SteamCandidate): CandidateRecord["steam"] {
  return {
    appId: c.appId,
    name: c.name,
    url: c.url,
    image: c.image,
    playing: c.currentPlayers,
    reviewsCount: c.reviewCount,
    price: c.price,
    released: c.released,
    genres: c.genres,
  };
}
