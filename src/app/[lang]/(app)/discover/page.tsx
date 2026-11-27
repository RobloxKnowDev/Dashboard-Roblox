import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ChartPills, ChartSection, parseChart } from "@/features/discover/sections";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.discover.title };
}

async function Pills({ searchParams }: { searchParams: PageProps<"/[lang]/discover">["searchParams"] }) {
  const params = await searchParams;
  return <ChartPills active={parseChart(typeof params.chart === "string" ? params.chart : undefined)} params={params} />;
}

async function Chart({ searchParams }: { searchParams: PageProps<"/[lang]/discover">["searchParams"] }) {
  return <ChartSection params={await searchParams} />;
}

export default async function DiscoverPage({ searchParams }: PageProps<"/[lang]/discover">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.nav.sections.market} title={t.nav.items.discover.title} description={t.discover.page.description} />
      <Suspense fallback={<div className="h-7" />}>
        <Pills searchParams={searchParams} />
      </Suspense>
      <Suspense
        fallback={
          <div className="rounded-lg border border-line bg-surface">
            <ListSkeleton rows={8} />
          </div>
        }
      >
        <Chart searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
