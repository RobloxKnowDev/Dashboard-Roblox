import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ReleasesSection } from "@/features/discover/sections";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.releases.title };
}

async function Releases({ searchParams }: { searchParams: PageProps<"/[lang]/discover/releases">["searchParams"] }) {
  return <ReleasesSection params={await searchParams} />;
}

export default async function WeeklyReleasesPage({ searchParams }: PageProps<"/[lang]/discover/releases">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.nav.sections.market} title={t.nav.items.releases.title} description={t.discover.releases.description} />
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
