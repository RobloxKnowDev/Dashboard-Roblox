import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { ChartSkeleton, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { RangeFilter, RangeFilterFallback } from "@/features/shared/range-filter";
import {
  ActiveAgents,
  ImportantAlerts,
  KpiGrid,
  MarketHighlights,
  OverviewCharts,
  RecentActivity,
  UpcomingTasks,
} from "@/features/overview/sections";

export const metadata: Metadata = { title: "Overview" };

function KpiSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading indicators">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <ChartSkeleton key={i} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <ListSkeleton rows={4} />
    </div>
  );
}

export default function OverviewPage({ searchParams }: PageProps<"/overview">) {
  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        description="Studio health at a glance — revenue, players, projects and agents."
        actions={
          <Suspense fallback={<RangeFilterFallback />}>
            <RangeFilter />
          </Suspense>
        }
      />

      <DemoBanner>
        Only the AI agents are illustrative until they report to the dashboard. Games, revenue, players, alerts,
        market highlights, projects, tasks and activity are real data.
      </DemoBanner>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiGrid searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <OverviewCharts searchParams={searchParams} />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <UpcomingTasks />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivity />
        </Suspense>
        <ActiveAgents />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <ImportantAlerts searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <MarketHighlights />
        </Suspense>
      </div>
    </PageContainer>
  );
}
