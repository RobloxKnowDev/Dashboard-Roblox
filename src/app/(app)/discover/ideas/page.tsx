import { Bookmark, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { DemoBadge, SourceBadge } from "@/components/feedback/demo-badge";
import { ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/primitives";
import { getChart } from "@/features/discover/data";
import { IdeasLibrary, type IdeaRow } from "@/features/ideas/components";
import { DEMO_WEEKLY_IDEAS } from "@/features/ideas/demo";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCompact } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Game Ideas" };

function WeeklyIdeas() {
  return (
    <Card>
      <CardHeader
        title="Top 5 ideas of the week"
        description="Will be generated weekly by the AI assistant from real market data"
        actions={<DemoBadge />}
      />
      <ol className="space-y-2 p-4">
        {DEMO_WEEKLY_IDEAS.map((idea, index) => (
          <li key={idea.id}>
            <details className="group rounded-md border border-line bg-surface-2/30 open:bg-surface-2/60">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="w-4 shrink-0 font-mono text-xs text-fg-3">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-fg">{idea.title}</p>
                  <p className="truncate text-xs text-fg-3">{idea.pitch}</p>
                </div>
                <Badge>{idea.genre}</Badge>
                <Badge tone="accent">{idea.score}</Badge>
                <ChevronDown className="size-4 shrink-0 text-fg-3 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-3 border-t border-line px-4 py-3 text-xs">
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    ["Target audience", idea.targetAudience],
                    ["Core loop", idea.coreLoop],
                    ["Monetization", idea.monetization],
                    ["Why now", idea.why],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-medium text-fg-3">{label}</dt>
                      <dd className="mt-0.5 text-fg-2">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex justify-end">
                  <ComingSoonButton size="sm" availability="Phase 2">
                    <Bookmark aria-hidden />
                    Save idea
                  </ComingSoonButton>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Live: genres of the experiences currently in Roblox's Up-and-Coming chart. */
async function GenreMomentum() {
  await connection();
  const chart = await getChart("up-and-coming", new Date().toISOString().slice(0, 10));
  if (chart.status !== "ok") return <ErrorState compact title="Market data unavailable" description="Roblox's charts couldn't be reached." />;

  const byGenre = new Map<string, { games: number; players: number }>();
  for (const game of chart.games) {
    const genre = game.genre ?? "Other";
    const entry = byGenre.get(genre) ?? { games: 0, players: 0 };
    entry.games += 1;
    entry.players += game.playerCount;
    byGenre.set(genre, entry);
  }
  const rows = [...byGenre.entries()].sort((a, b) => b[1].players - a[1].players).slice(0, 7);
  const max = rows[0]?.[1].players ?? 1;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Genres gaining traction" description="Players in Roblox's Up-and-Coming chart, by genre" actions={<SourceBadge source="live" />} />
      <ul className="space-y-3 p-5">
        {rows.map(([genre, stats]) => (
          <li key={genre}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="font-medium text-fg">{genre}</span>
              <span className="text-fg-3 tabular">
                {formatCompact(stats.players)} players · {stats.games} game{stats.games > 1 ? "s" : ""}
              </span>
            </div>
            <Progress value={(stats.players / max) * 100} label={`${genre} share`} tone="info" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function Library() {
  const [user, supabase] = await Promise.all([requireUser(), createClient()]);
  const { data, error } = await supabase
    .from("game_ideas")
    .select("id, title, pitch, genre, target_audience, core_loop, monetization, score, status, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return <ErrorState description="The ideas library couldn't be loaded." />;
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

export default function GameIdeasPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Market Intelligence" title="Game Ideas" description="Ideas worth building, the market signals behind them, and your library." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WeeklyIdeas />
        </div>
        <Suspense fallback={<div className="rounded-lg border border-line bg-surface"><ListSkeleton rows={5} /></div>}>
          <GenreMomentum />
        </Suspense>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Ideas library</h2>
        <Suspense fallback={<div className="rounded-lg border border-line bg-surface"><ListSkeleton rows={3} /></div>}>
          <Library />
        </Suspense>
      </section>
    </PageContainer>
  );
}
