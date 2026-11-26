import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { AddGameButton } from "@/features/games/admin-controls";
import { GameCard } from "@/features/games/components";
import { listGames } from "@/features/games/data";
import { checkAccess } from "@/lib/auth/session";
import { getDailyMetric } from "@/lib/integrations/roblox/analytics";
import { getRobloxGames } from "@/lib/integrations/roblox/public";

export const metadata: Metadata = { title: "My Games" };

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
  const [games, access] = await Promise.all([listGames(), checkAccess("admin")]);
  if (games === null) return <ErrorState description="Your games couldn't be loaded. Refresh the page to try again." />;
  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="No games yet"
          description={
            access.status === "allowed"
              ? "Add an experience with its Universe ID — its name, icon and live stats come straight from Roblox."
              : "An administrator can add the studio's experiences here."
          }
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
    Promise.all(games.map((g) => getDailyMetric(g.universe_id, "DailyActiveUsers", isoDaysAgo(now, 7), today))),
  ]);

  return (
    <>
      {roblox === null ? (
        <p role="status" className="text-xs text-warning">
          Roblox couldn&apos;t be reached — live stats are temporarily unavailable.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {games.map((game, index) => {
          const result = dauResults[index];
          const dau =
            result?.status === "ok"
              ? { status: "ok" as const, value: result.points.at(-1)?.value ?? null }
              : { status: result?.status ?? ("error" as const), value: null };
          return <GameCard key={game.id} game={game} roblox={roblox?.get(game.universe_id)} dau={dau} />;
        })}
      </div>
      <p className="text-[11px] text-fg-3">
        Live from Roblox — players online, visits and favorites refresh every minute; analytics are daily and about a day
        behind.
      </p>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Loading games">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[196px] rounded-lg" />
      ))}
    </div>
  );
}

export default function MyGamesPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Development"
        title="My Games"
        description="Every experience published by the studio, with live stats from Roblox."
        actions={
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <GamesGrid />
      </Suspense>
    </PageContainer>
  );
}
