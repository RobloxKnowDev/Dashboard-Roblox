import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ChartPills, ChartSection, parseChart } from "@/features/discover/sections";

export const metadata: Metadata = { title: "Roblox Discover" };

async function Pills({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  const params = await searchParams;
  return <ChartPills active={parseChart(typeof params.chart === "string" ? params.chart : undefined)} params={params} />;
}

async function Chart({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  return <ChartSection params={await searchParams} />;
}

export default function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  return (
    <PageContainer>
      <PageHeader eyebrow="Market Intelligence" title="Roblox Discover" description="What's trending, growing and earning on Roblox — live from Roblox's charts." />
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
