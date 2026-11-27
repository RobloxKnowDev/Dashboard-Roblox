import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { summarizeFinance } from "@/features/finance/compute";
import { listTransactions } from "@/features/finance/data";
import { getChart } from "@/features/discover/data";
import { getGameAcquisition } from "@/features/games/acquisition";
import { avgOf, getGameAnalytics, sumOf } from "@/features/games/analytics";
import { listGames } from "@/features/games/data";
import { listPayouts } from "@/features/games/payouts";
import { getStudioMetrics } from "@/features/overview/studio";
import { listProjects } from "@/features/projects/data";
import { parseRange, RANGE_OPTIONS } from "@/features/shared/range";
import { listTasks } from "@/features/tasks/data";
import { listTeamMembers } from "@/features/team/data";
import { LOCALE_NAMES, type Locale } from "@/i18n/config";
import { ASSISTANT_MODEL, getClaude } from "@/lib/ai/claude";
import { recordUsage } from "@/lib/ai/usage";
import { hasMinRole } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { CHART_SORTS, type ChartSortId } from "@/lib/integrations/roblox/explore";
import { getRobloxGames, likeRatio } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "./types";

/**
 * The AI Assistant on Claude (Haiku 5.5). Tools are read-only and run with
 * the signed-in user's own Supabase session: RLS decides what they return,
 * exactly like the pages (a Developer gets no finance data).
 */

const MAX_TOOL_ROUNDS = 6;
const RANGE_KEYS = RANGE_OPTIONS.map((o) => o.value) as [string, ...string[]];

const round = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? null : Number(value.toFixed(digits));

const json = (value: unknown) => JSON.stringify(value);

/** Case-insensitive match of a game by name (or part of it). */
async function findGame(query: string) {
  const games = (await listGames()) ?? [];
  const q = query.trim().toLowerCase();
  return games.find((g) => g.name.toLowerCase() === q) ?? games.find((g) => g.name.toLowerCase().includes(q)) ?? null;
}

function buildTools(user: SessionUser & { role: NonNullable<SessionUser["role"]> }, today: string) {
  const getStudioOverview = betaZodTool({
    name: "get_studio_overview",
    description:
      "Studio-wide figures for a period: revenue in Robux (game sales + Creator Rewards/Roblox Plus), average daily active users, players online now, visits per game, alerts, and the DevEx rate (USD per Robux).",
    inputSchema: z.object({ range: z.enum(RANGE_KEYS).optional().describe("7d, 30d (default), 90d or 12m") }),
    run: async ({ range }) => {
      const metrics = await getStudioMetrics(range ?? "30d", today);
      if (metrics.status !== "ok") return json({ status: metrics.status });
      return json({
        period: metrics.range.label,
        games: metrics.gameCount,
        gamesWithAnalytics: metrics.analyticsCount,
        gamesWithoutAnalyticsAccess: metrics.unauthorized.map((g) => g.name),
        playingNow: metrics.playingNow,
        revenueRobux: { total: Math.round(metrics.revenue.total), gameSales: Math.round(metrics.revenue.sales), rewardsEstimate: Math.round(metrics.revenue.rewards), previousPeriod: metrics.revenue.previous === null ? null : Math.round(metrics.revenue.previous) },
        devexUsdPerRobux: metrics.devexRate,
        averageDailyActiveUsers: { current: round(metrics.dau.average, 0), previousPeriod: round(metrics.dau.previous, 0) },
        visitsPerGame: metrics.perGame,
        alerts: metrics.alerts.map((a) => ({ severity: a.severity, title: a.title, detail: a.detail })),
      });
    },
  });

  const getGameStats = betaZodTool({
    name: "get_game_stats",
    description:
      "One of the studio's games: live public stats (playing now, total visits, favorites, rating) and Roblox Analytics for the period (DAU, revenue, retention D1/D7/D30, session length, visits, Creator Rewards/Roblox Plus). Set include_acquisition for impressions by source, click-through, qualified play-through and first-play bounce rate (slower).",
    inputSchema: z.object({
      game: z.string().describe("Game name or part of it"),
      range: z.enum(RANGE_KEYS).optional(),
      include_acquisition: z.boolean().optional(),
    }),
    run: async ({ game: query, range: rangeKey, include_acquisition }) => {
      const game = await findGame(query);
      if (!game) return json({ error: "No studio game matches that name.", games: ((await listGames()) ?? []).map((g) => g.name) });
      const range = parseRange(rangeKey ?? "30d");
      const [roblox, analytics, payouts] = await Promise.all([
        getRobloxGames([game.universe_id]),
        getGameAnalytics(game.universe_id, range, today),
        listPayouts([game.id]),
      ]);
      const info = roblox?.get(game.universe_id);
      const result: Record<string, unknown> = {
        name: game.name,
        status: game.status,
        live: info
          ? { playingNow: info.playing, totalVisits: info.visits, favorites: info.favorites, likeRatio: round(likeRatio(info), 3), updated: info.updated.slice(0, 10) }
          : "unavailable",
        period: range.label,
        analyticsStatus: analytics.status,
        payoutsRobuxByMonth: payouts.map((p) => ({ month: p.month.slice(0, 7), source: p.source, robux: p.robux })),
      };
      if (analytics.status === "ok") {
        result.analytics = {
          averageDau: round(avgOf(analytics.dau.current), 0),
          averageDauPrevious: round(avgOf(analytics.dau.previous), 0),
          gameSalesRobux: Math.round(sumOf(analytics.revenue.current)),
          gameSalesRobuxPrevious: analytics.revenue.previous.length ? Math.round(sumOf(analytics.revenue.previous)) : null,
          visits: Math.round(sumOf(analytics.visits.current)),
          retentionD1: round(avgOf(analytics.d1.current), 3),
          retentionD7: round(avgOf(analytics.d7.current), 3),
          retentionD30: round(avgOf(analytics.d30.current), 3),
          averageSessionMinutes: round(avgOf(analytics.session.current), 1),
          peakConcurrentLast28Days: Math.max(0, ...analytics.peakCcu.current.map((p) => p.value)),
        };
      }
      if (include_acquisition) {
        const acq = await getGameAcquisition(game.universe_id, range, today);
        result.acquisition =
          acq.status === "ok"
            ? {
                period: acq.range.label,
                sources: acq.sources.map((s) => ({ source: s.label, playersReached: Math.round(s.reachedTotal), playersWhoPlayed: Math.round(s.playedTotal), playRate: round(s.playRate, 4) })),
                impressionClickThrough: round(avgOf(acq.impressionCtr.current), 4),
                qualifiedPlayThrough: round(avgOf(acq.qualifiedPtr.current), 4),
                firstPlayBounceUnder60s: round(avgOf(acq.bounce60.current), 3),
                newPlayers: Math.round(sumOf(acq.newPlayers)),
                returningPlayers: Math.round(sumOf(acq.returningPlayers)),
              }
            : acq.status;
      }
      return json(result);
    },
  });

  const getFinance = betaZodTool({
    name: "get_finance_summary",
    description: "Studio finances recorded in the dashboard (USD): revenue, expenses, profit, margin, this month vs last month, monthly history, revenue per game. Administrators and owners only.",
    inputSchema: z.object({}),
    run: async () => {
      if (!hasMinRole(user.role, "admin")) return json({ error: "Finance is restricted to administrators and owners — this user can't see it." });
      const transactions = await listTransactions();
      if (transactions === null) return json({ error: "Finance data couldn't be loaded." });
      const s = summarizeFinance(transactions, today, 12);
      return json({
        transactionsRecorded: s.count,
        totalRevenueUsd: s.totalRevenue,
        totalExpensesUsd: s.totalExpenses,
        profitUsd: s.profit,
        margin: round(s.margin, 3),
        developmentCostsUsd: s.development,
        advertisingCostsUsd: s.advertising,
        thisMonth: s.thisMonth,
        previousMonth: s.previousMonth,
        monthly: s.monthly.map((m) => ({ month: m.month, revenue: m.revenue, expenses: m.expenses })),
        revenuePerGame: s.revenuePerGame,
      });
    },
  });

  const getProjects = betaZodTool({
    name: "get_projects",
    description: "The studio's projects: status, progress, target release date, linked game, members, open and done tasks.",
    inputSchema: z.object({}),
    run: async () => {
      const projects = await listProjects();
      if (projects === null) return json({ error: "Projects couldn't be loaded." });
      return json(
        projects.map((p) => ({
          name: p.name,
          status: p.status,
          progressPercent: p.progress,
          targetRelease: p.targetReleaseDate,
          game: p.game?.name ?? null,
          members: p.members.map((m) => m.name),
          tasks: p.tasks,
        })),
      );
    },
  });

  const getTasks = betaZodTool({
    name: "get_tasks",
    description: "Tasks of the studio with status, priority, due date, project and assignee. Filter open (not done), overdue, mine (assigned to the current user) or all.",
    inputSchema: z.object({ filter: z.enum(["open", "overdue", "mine", "all"]).optional() }),
    run: async ({ filter = "open" }) => {
      const tasks = await listTasks();
      if (tasks === null) return json({ error: "Tasks couldn't be loaded." });
      const open = (t: (typeof tasks)[number]) => t.status !== "done" && t.status !== "cancelled";
      const selected = tasks.filter((t) =>
        filter === "all" ? true : filter === "mine" ? t.assignee?.profileId === user.id && open(t) : filter === "overdue" ? open(t) && !!t.dueDate && t.dueDate < today : open(t),
      );
      return json({
        total: selected.length,
        tasks: selected.slice(0, 60).map((t) => ({ title: t.title, status: t.status, priority: t.priority, due: t.dueDate, project: t.project?.name ?? null, assignee: t.assignee?.name ?? null })),
      });
    },
  });

  const getTeam = betaZodTool({
    name: "get_team",
    description: "Team members: job title, dashboard access role, status, projects and open tasks.",
    inputSchema: z.object({}),
    run: async () => {
      const members = await listTeamMembers();
      if (members === null) return json({ error: "Team couldn't be loaded." });
      return json(
        members.map((m) => ({ name: m.name, jobTitle: m.studioRole, access: m.access, status: m.status, projects: m.projects.map((p) => p.name), tasks: m.tasks })),
      );
    },
  });

  const getMarket = betaZodTool({
    name: "get_roblox_market",
    description: `Roblox public charts right now (top 25 of a chart): players online, genre, rating, change vs yesterday and last week when known. Charts: ${Object.entries(CHART_SORTS).map(([id, name]) => `${id} (${name})`).join(", ")}.`,
    inputSchema: z.object({ chart: z.enum(Object.keys(CHART_SORTS) as [ChartSortId, ...ChartSortId[]]).optional() }),
    run: async ({ chart = "up-and-coming" }) => {
      const result = await getChart(chart, today);
      if (result.status !== "ok") return json({ error: "Roblox charts are unavailable right now." });
      return json(
        result.games.slice(0, 25).map((g) => ({
          rank: g.rank,
          name: g.name,
          genre: g.genre,
          playing: g.playerCount,
          likeRatio: round(likeRatio(g), 3),
          ageDays: g.ageDays,
          playingYesterday: g.playersYesterday,
          playingLastWeek: g.playersLastWeek,
        })),
      );
    },
  });

  const getIdeas = betaZodTool({
    name: "get_game_ideas",
    description: "This week's AI game ideas (from Steam trends, each checked against Roblox) and the studio's saved idea library.",
    inputSchema: z.object({}),
    run: async () => {
      const supabase = await createClient();
      const [{ data: run }, { data: library }] = await Promise.all([
        supabase.from("idea_runs").select("id, week_of, weekly_ideas(rank, score, steam, content, roblox_check)").eq("status", "succeeded").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("game_ideas").select("title, pitch, genre, score, status").neq("status", "archived").order("created_at", { ascending: false }).limit(30),
      ]);
      return json({ weekly: run ?? null, library: library ?? [] });
    },
  });

  return [getStudioOverview, getGameStats, getFinance, getProjects, getTasks, getTeam, getMarket, getIdeas];
}

function systemPrompt(user: SessionUser, locale: Locale, today: string) {
  return [
    {
      type: "text" as const,
      text: [
        "You are the assistant of a Roblox game studio, inside its private dashboard.",
        "Answer questions about the studio's games, analytics, revenue, finances, projects, tasks, team, the Roblox market and game ideas.",
        "Get facts with the tools before answering; never invent figures. If a tool reports that data is unavailable or not allowed, say so plainly.",
        "Robux amounts: write them like R$ 12.9K; convert to USD with the DevEx rate only when useful, and say it's an estimate.",
        "Rates in tool results are ratios (0.052 = 5.2%).",
        "Be concise and practical: short paragraphs or bullet lists, Markdown allowed (bold, lists, small tables). End with a concrete suggestion when it helps.",
        "Your access is read-only: you can't create or change anything. Point to the right page of the dashboard instead.",
      ].join("\n"),
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: `Today is ${today}. The user is ${user.name} (dashboard role: ${user.role ?? "pending"}). Always reply in ${LOCALE_NAMES[locale]}.`,
    },
  ];
}

export type ClaudeAnswer = { content: string; cost: number };

/**
 * One assistant answer. Throws on API errors (the Server Action turns them
 * into a friendly message).
 */
export async function claudeAnswer(history: ChatMessage[], user: SessionUser & { role: NonNullable<SessionUser["role"]> }, locale: Locale, today: string): Promise<ClaudeAnswer> {
  const client = getClaude();
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set");

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const runner = client.beta.messages.toolRunner({
    model: ASSISTANT_MODEL,
    max_tokens: 4000,
    max_iterations: MAX_TOOL_ROUNDS,
    output_config: { effort: "low" },
    system: systemPrompt(user, locale, today),
    tools: buildTools(user, today),
    messages,
  });

  let last: Anthropic.Beta.BetaMessage | undefined;
  let cost = 0;
  for await (const message of runner) {
    last = message;
    cost += await recordUsage({ feature: "assistant", model: ASSISTANT_MODEL, usage: message.usage, userId: user.id });
  }
  if (!last) throw new Error("No answer");
  if (last.stop_reason === "refusal") return { content: "", cost };

  const text = last.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
  return { content: text, cost };
}
