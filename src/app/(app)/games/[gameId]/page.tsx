import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { GameAnalyticsSection, GameHeader, GameLiveStats, GamePayoutsSection } from "@/features/games/detail";
import { RangeFilter, RangeFilterFallback } from "@/features/shared/range-filter";

export const metadata: Metadata = { title: "Game" };

function HeaderSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading game">
      <Skeleton className="h-3 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-[72px] rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

export default function GamePage({ params, searchParams }: PageProps<"/games/[gameId]">) {
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

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-6">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Analytics</h2>
          <p className="mt-0.5 text-[13px] text-fg-3">Players, revenue and retention from Roblox Analytics.</p>
        </div>
        <Suspense fallback={<RangeFilterFallback />}>
          <RangeFilter />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        }
      >
        <GameAnalyticsSection params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <GamePayoutsSection params={params} />
      </Suspense>
    </PageContainer>
  );
}
