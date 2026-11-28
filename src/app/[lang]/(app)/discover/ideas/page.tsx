import { ChevronDown, ExternalLink, Info, Search, TriangleExclamationPoint } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/primitives";
import { getChart } from "@/features/discover/data";
import { IdeasLibrary, type IdeaRow } from "@/features/ideas/components";
import { getWeeklyIdeas } from "@/features/ideas/weekly";
import { GenerateIdeasButton, SaveWeeklyIdeaButton } from "@/features/ideas/weekly-components";
import type { RobloxMatch, Verdict, WeeklyIdea } from "@/features/ideas/weekly-types";
import { getI18n, getT } from "@/i18n/server";
import { isClaudeConfigured } from "@/lib/ai/claude";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { robloxGameUrl } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";

/** "Generate now" runs after the response (after()) — allow it the full duration. */
export const maxDuration = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.ideas.title };
}

const VERDICT_TONE: Record<Verdict, BadgeTone> = { free: "good", similar: "info", exists: "warning" };

/* ───────────────────────────── Weekly ideas ───────────────────────────── */

async function RobloxGames({ matches }: { matches: RobloxMatch[] }) {
  const { t, f } = await getI18n();
  const w = t.ideas.weekly;
  if (matches.length === 0) return <p className="text-fg-3">{w.noMatch}</p>;
  return (
    <ul className="space-y-1">
      {matches.map((m) => (
        <li key={m.universeId} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {m.placeId ? (
            <a href={robloxGameUrl(m.placeId)} target="_blank" rel="noopener noreferrer" className="font-medium text-fg-2 hover:text-accent-ink">
              {m.name}
            </a>
          ) : (
            <span className="font-medium text-fg-2">{m.name}</span>
          )}
          <span className="text-fg-3 tabular">
            {w.playing(f.formatCompact(m.playing))}
            {m.visits !== null ? ` · ${w.visits(f.formatCompact(m.visits))}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function IdeaItem({ idea, index, canSave }: { idea: WeeklyIdea; index: number; canSave: boolean }) {
  const { t, f, locale } = await getI18n();
  const w = t.ideas.weekly;
  const content = idea.content[locale];
  const check = idea.robloxCheck;
  return (
    <li>
      <details className="group rounded-md border border-line bg-surface-2/30 open:bg-surface-2/60">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="w-4 shrink-0 font-mono text-xs text-fg-3">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg">{content.title}</p>
            <p className="truncate text-xs text-fg-3">{content.pitch}</p>
          </div>
          <Badge className="hidden sm:inline-flex">{content.genre}</Badge>
          {idea.score !== null ? (
            <Badge tone="accent" title={w.score}>
              {idea.score}
            </Badge>
          ) : null}
          <ChevronDown className="size-4 shrink-0 text-fg-3 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-line px-4 py-3 text-xs">
          <p className="text-[13px] leading-relaxed text-fg-2">{content.pitch}</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              [w.targetAudience, content.targetAudience],
              [w.coreLoop, content.coreLoop],
              [w.monetization, content.monetization],
              [w.why, content.why],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium text-fg-3">{label}</dt>
                <dd className="mt-0.5 leading-relaxed text-fg-2">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Steam source */}
            <section className="flex gap-3 rounded-md border border-line bg-surface p-3" aria-label={w.inspiredBy}>
              {idea.steam.image ? (
                <Image src={idea.steam.image} alt="" width={120} height={56} unoptimized className="h-14 w-[120px] shrink-0 rounded object-cover" />
              ) : null}
              <div className="min-w-0 space-y-0.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-fg-3">{w.inspiredBy}</p>
                <a href={idea.steam.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-fg hover:text-accent-ink">
                  {idea.steam.name}
                  <ExternalLink className="size-3" aria-hidden />
                  <span className="sr-only">{w.openOnSteam}</span>
                </a>
                <p className="text-fg-3">
                  {[
                    idea.steam.playing !== null ? w.steamPlaying(f.formatCompact(idea.steam.playing)) : null,
                    idea.steam.reviewsCount ? w.steamReviews(f.formatCompact(idea.steam.reviewsCount)) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </section>

            {/* Roblox check */}
            <section className="space-y-2 rounded-md border border-line bg-surface p-3" aria-label={w.robloxCheck}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-fg-3">{w.robloxCheck}</p>
                <Badge tone={VERDICT_TONE[check.verdict]} dot>
                  {w.verdicts[check.verdict]}
                </Badge>
              </div>
              {check.summary[locale] ? <p className="leading-relaxed text-fg-2">{check.summary[locale]}</p> : null}
              <p className="flex flex-wrap items-center gap-1 text-fg-3">
                <Search className="size-3" aria-hidden />
                <span className="sr-only">{w.searched}:</span>
                {check.queries.map((q) => (
                  <span key={q} className="rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px]">
                    {q}
                  </span>
                ))}
              </p>
              <div>
                <p className="mb-1 text-fg-3">{w.closest}</p>
                <RobloxGames matches={check.closest} />
              </div>
            </section>
          </div>

          {canSave ? (
            <div className="flex justify-end">
              <SaveWeeklyIdeaButton ideaId={idea.id} />
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

async function WeeklyIdeas() {
  await connection();
  const [{ t, f }, user, data] = await Promise.all([getI18n(), requireUser(), getWeeklyIdeas()]);
  const w = t.ideas.weekly;
  const role = user.role ?? "viewer";
  const isOwner = hasMinRole(role, "owner");
  const configured = isClaudeConfigured();

  const lastRun = data?.lastRun ?? null;
  const running = data?.generating ?? false;
  const failed = lastRun?.status === "failed" ? lastRun : null;
  const latest = data?.latest ?? null;

  const actions = (
    <>
      {latest ? <Badge>{w.weekOf(f.formatDate(latest.weekOf))}</Badge> : null}
      <SourceBadge source="live" />
      {isOwner && configured && !running ? <GenerateIdeasButton label={latest ? w.regenerate : w.generate} /> : null}
    </>
  );

  return (
    <Card>
      <CardHeader title={w.title} description={w.description} actions={actions} />
      <div className="space-y-3 p-4">
        {running ? (
          <p role="status" className="flex items-start gap-2 rounded-md border border-info/25 bg-info/10 px-3 py-2 text-xs text-info">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{w.generating}</span>
          </p>
        ) : null}
        {failed && isOwner ? (
          <p role="status" className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
            <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{w.lastFailed(failed.error ?? "—")}</span>
          </p>
        ) : null}

        {data === null ? (
          <ErrorState compact />
        ) : !configured && !latest ? (
          <EmptyState compact title={w.notConfiguredTitle} description={w.notConfigured} />
        ) : !latest || latest.ideas.length === 0 ? (
          <EmptyState compact title={w.emptyTitle} description={isOwner ? w.emptyOwner : w.emptyMember} />
        ) : (
          <>
            <ol className="space-y-2">
              {latest.ideas.map((idea, index) => (
                <IdeaItem key={idea.id} idea={idea} index={index} canSave={hasMinRole(role, "developer")} />
              ))}
            </ol>
            <p className="text-[11px] text-fg-3">
              {w.generatedAt(f.formatDate(latest.finishedAt ?? latest.createdAt))}
              {isOwner ? ` · ${w.costNote(f.formatCurrency(latest.costUsd, { cents: true }))}` : ""}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

/** Steam trends of the latest run that Roblox already covers. */
async function AlreadyOnRoblox() {
  await connection();
  const [{ t, locale }, data] = await Promise.all([getI18n(), getWeeklyIdeas()]);
  const w = t.ideas.weekly;
  const taken = (data?.latest?.candidates ?? []).filter((c) => c.verdict === "exists");
  if (!data?.latest) return null;
  return (
    <Card>
      <CardHeader title={w.takenTitle} description={w.takenDescription} actions={<SourceBadge source="live" />} />
      {taken.length === 0 ? (
        <p className="px-5 pb-5 pt-3 text-xs text-fg-3">{w.takenEmpty}</p>
      ) : (
        <ul className="divide-y divide-line px-5 pb-2 pt-1">
          {taken.map((c) => (
            <li key={c.steam.appId} className="space-y-1.5 py-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={c.steam.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg hover:text-accent-ink">
                  {c.steam.name}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
                <Badge tone={VERDICT_TONE[c.verdict]} dot>
                  {w.verdicts[c.verdict]}
                </Badge>
              </div>
              {c.summary[locale] ? <p className="leading-relaxed text-fg-2">{c.summary[locale]}</p> : null}
              <RobloxGames matches={c.matches} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ───────────────────────────── Market & library ───────────────────────────── */

/** Live: genres of the experiences currently in Roblox's Up-and-Coming chart. */
async function GenreMomentum() {
  await connection();
  const { t, f } = await getI18n();
  const p = t.ideas.page;
  const chart = await getChart("up-and-coming", new Date().toISOString().slice(0, 10));
  if (chart.status !== "ok") return <ErrorState compact title={p.marketUnavailableTitle} description={p.marketUnavailable} />;

  const byGenre = new Map<string, { games: number; players: number }>();
  for (const game of chart.games) {
    const genre = game.genre ?? p.genreOther;
    const entry = byGenre.get(genre) ?? { games: 0, players: 0 };
    entry.games += 1;
    entry.players += game.playerCount;
    byGenre.set(genre, entry);
  }
  const rows = [...byGenre.entries()].sort((a, b) => b[1].players - a[1].players).slice(0, 7);
  const max = rows[0]?.[1].players ?? 1;

  return (
    <Card className="flex flex-col">
      <CardHeader title={p.genresTitle} description={p.genresDescription} actions={<SourceBadge source="live" />} />
      <ul className="space-y-3 p-5">
        {rows.map(([genre, stats]) => (
          <li key={genre}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="font-medium text-fg">{genre}</span>
              <span className="text-fg-3 tabular">{p.genrePlayers(f.formatCompact(stats.players), stats.games)}</span>
            </div>
            <Progress value={(stats.players / max) * 100} label={p.genreShare(genre)} tone="info" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function Library() {
  const [user, supabase, t] = await Promise.all([requireUser(), createClient(), getT()]);
  const { data, error } = await supabase
    .from("game_ideas")
    .select("id, title, pitch, genre, target_audience, core_loop, monetization, score, status, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return <ErrorState description={t.ideas.page.libraryError} />;
  const role = user.role ?? "viewer";
  const ideas: IdeaRow[] = data.map((i) => ({
    id: i.id,
    title: i.title,
    pitch: i.pitch,
    genre: i.genre,
    targetAudience: i.target_audience,
    coreLoop: i.core_loop,
    monetization: i.monetization,
    score: i.score,
    status: i.status,
    createdBy: i.created_by,
    createdAt: i.created_at,
  }));
  return <IdeasLibrary ideas={ideas} canEdit={hasMinRole(role, "developer")} canDeleteAny={hasMinRole(role, "admin")} userId={user.id} />;
}

const listFallback = (
  <div className="rounded-lg border border-line bg-surface">
    <ListSkeleton rows={5} />
  </div>
);

export default async function GameIdeasPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.nav.sections.market} title={t.nav.items.ideas.title} description={t.ideas.page.description} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Suspense fallback={listFallback}>
            <WeeklyIdeas />
          </Suspense>
          <Suspense fallback={null}>
            <AlreadyOnRoblox />
          </Suspense>
        </div>
        <Suspense fallback={listFallback}>
          <GenreMomentum />
        </Suspense>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{t.ideas.page.libraryTitle}</h2>
        <Suspense fallback={listFallback}>
          <Library />
        </Suspense>
      </section>
    </PageContainer>
  );
}
