import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { PresentationArea, PresentationButton } from "@/features/earnings/presentation";
import { EarningsBoard } from "@/features/earnings/sections";
import { RangeFilter, RangeFilterFallback } from "@/features/shared/range-filter";
import { getT } from "@/i18n/server";
import { PERMISSIONS } from "@/lib/auth/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.earnings.title };
}

/** The studio's earnings in dollars — nothing else, ready to show off (full screen). */
export default async function EarningsPage({ searchParams }: PageProps<"/[lang]/earnings">) {
  const t = await getT();
  return (
    <PresentationArea>
      <PageContainer>
        <PageHeader
          title={t.earnings.page.title}
          description={t.earnings.page.description}
          info={t.earnings.page.info}
          actions={
            <>
              <Suspense fallback={<RangeFilterFallback />}>
                <RangeFilter />
              </Suspense>
              <PresentationButton />
            </>
          }
        />
        <RequireRole min={PERMISSIONS["finance.read"]}>
          <Suspense
            fallback={
              <div className="space-y-4" role="status" aria-label={t.earnings.page.loading}>
                <Skeleton className="h-[300px] rounded-lg lg:h-[236px]" />
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            }
          >
            <EarningsBoard searchParams={searchParams} />
          </Suspense>
        </RequireRole>
      </PageContainer>
    </PresentationArea>
  );
}
