import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { AddGameButton } from "@/features/games/admin-controls";
import { GameCard } from "@/features/games/components";
import { listGames } from "@/features/games/data";
import { getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";
import { getDailyMetric } from "@/lib/integrations/roblox/analytics";
import { getRobloxGames } from "@/lib/integrations/roblox/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.games.list.metaTitle };
}

async function HeaderActions() {
  const access = await checkAccess("admin");
  return access.status === "allowed" ? <AddGameButton /> : null;
}

function isoDaysAgo(today: Date, days: number) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function GamesGrid() {
  const [games, access, t] = await Promise.all([listGames(), checkAccess("admin"), getT()]);
  if (games === null) return <ErrorState description={t.games.list.loadError} />;
  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title={t.games.list.emptyTitle}
          description={access.status === "allowed" ? t.games.list.emptyAdmin : t.games.list.emptyMember}
          action={access.status === "allowed" ? <AddGameButton /> : undefined}
        />
      </div>
    );
  }

  await connection();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [roblox, dauResults] = await Promise.all([
    getRobloxGames(games.map((g) => g.universe_id)),
    // Same window as the Overview's default DAU query (30 days + previous 30): shared cache entry.
    Promise.all(games.map((g) => getDailyMetric(g.universe_id, "DailyActiveUsers", isoDaysAgo(now, 60), today))),
  ]);

  return (
    <>
      {roblox === null ? (
        <p role="status" className="text-xs text-warning">
          {t.games.list.robloxUnreachable}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {games.map((game, index) => {
          const result = dauResults[index];
          const dau =
            result?.status === "ok"
              ? { status: "ok" as const, value: result.points.at(-1)?.value ?? null }
              : { status: result?.status ?? ("error" as const), value: null };
          return <GameCard key={game.id} game={game} roblox={roblox?.get(game.universe_id)} dau={dau} />;
        })}
      </div>
      <p className="text-[11px] text-fg-3">{t.games.list.footnote}</p>
    </>
  );
}

function GridSkeleton({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label={label}>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[196px] rounded-lg" />
      ))}
    </div>
  );
}

export default async function MyGamesPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={t.games.list.eyebrow}
        title={t.games.list.title}
        description={t.games.list.description}
        actions={
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton label={t.games.list.loading} />}>
        <GamesGrid />
      </Suspense>
    </PageContainer>
  );
}
