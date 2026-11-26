import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Roblox Discover" };

export default function DiscoverPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Roblox Discover"
        eyebrow="Market Intelligence"
        description="Trending and fast-growing Roblox experiences worth watching."
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Popular games",
          "Fastest-growing games",
          "Games to watch",
          "Genre and period filters",
          "Search"
        ]}
      />
    </PageContainer>
  );
}
