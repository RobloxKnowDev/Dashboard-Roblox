import type { Metadata } from "next";
import { Suspense } from "react";
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
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.overview.title };
}

function KpiSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <Skeleton className="h-[300px] rounded-lg lg:h-[236px]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <ChartSkeleton key={i} className={i === 0 || i === 3 ? "xl:col-span-2" : undefined} />
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

export default async function OverviewPage({ searchParams }: PageProps<"/[lang]/overview">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        title={t.nav.items.overview.title}
        description={t.overview.page.description}
        info={t.overview.page.info}
        actions={
          <Suspense fallback={<RangeFilterFallback />}>
            <RangeFilter />
          </Suspense>
        }
      />

      <Suspense fallback={<KpiSkeleton label={t.overview.page.loadingKpis} />}>
        <KpiGrid searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <OverviewCharts searchParams={searchParams} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <UpcomingTasks />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivity />
        </Suspense>
        <ActiveAgents />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
