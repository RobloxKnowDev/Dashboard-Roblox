import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ReleasesSection } from "@/features/discover/sections";

export const metadata: Metadata = { title: "Weekly Releases" };

async function Releases({ searchParams }: { searchParams: PageProps<"/discover/releases">["searchParams"] }) {
  return <ReleasesSection params={await searchParams} />;
}

export default function WeeklyReleasesPage({ searchParams }: PageProps<"/discover/releases">) {
  return (
    <PageContainer>
      <PageHeader eyebrow="Market Intelligence" title="Weekly Releases" description="New Roblox experiences that are already getting traction." />
      <Suspense
        fallback={
          <div className="rounded-lg border border-line bg-surface">
            <ListSkeleton rows={8} />
          </div>
        }
      >
        <Releases searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
