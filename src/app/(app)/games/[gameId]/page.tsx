import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { GameAcquisitionSection, GameThumbnailsSection } from "@/features/games/acquisition-sections";
import { GameAnalyticsSection, GameHeader, GameLiveStats, GamePayoutsSection } from "@/features/games/detail";
import { GameStatsTabs, GameStatsTabsFallback } from "@/features/games/stats-tabs";
import { parseGameTab } from "@/features/games/tabs";
import { RangeFilter, RangeFilterFallback } from "@/features/shared/range-filter";

export const metadata: Metadata = { title: "Game" };

function HeaderSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading game">
      <Skeleton className="h-3 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-[72px] rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 sm:w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading statistics">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * The open tab's content. Each tab queries Roblox only when it is opened
 * (every data point counts against the API key's budget).
 */
async function GameStats({ params, searchParams }: PageProps<"/games/[gameId]">) {
  const tab = parseGameTab((await searchParams).tab);
  if (tab === "acquisition") {
    return (
      <Suspense fallback={<StatsSkeleton />}>
        <GameAcquisitionSection params={params} searchParams={searchParams} />
      </Suspense>
    );
  }
  if (tab === "thumbnails") {
    return (
      <Suspense fallback={<StatsSkeleton />}>
        <GameThumbnailsSection params={params} searchParams={searchParams} />
      </Suspense>
    );
  }
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <GameAnalyticsSection params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <GamePayoutsSection params={params} />
      </Suspense>
    </>
  );
}

export default function GamePage(props: PageProps<"/games/[gameId]">) {
  const { params } = props;
  return (
    <PageContainer>
      <Suspense fallback={<HeaderSkeleton />}>
        <GameHeader params={params} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-lg" />
            ))}
          </div>
        }
      >
        <GameLiveStats params={params} />
      </Suspense>

      <div className="space-y-4 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Analytics</h2>
            <p className="mt-0.5 text-[13px] text-fg-3">Players, revenue, acquisition and thumbnails from Roblox Analytics.</p>
          </div>
          <Suspense fallback={<RangeFilterFallback />}>
            <RangeFilter />
          </Suspense>
        </div>
        <Suspense fallback={<GameStatsTabsFallback />}>
          <GameStatsTabs />
        </Suspense>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <GameStats {...props} />
      </Suspense>
    </PageContainer>
  );
}
