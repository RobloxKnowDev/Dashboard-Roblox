import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Watchlist" };

export default function WatchlistPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Watchlist"
        eyebrow="Market Intelligence"
        description="Games you track, with their history."
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Tracked games",
          "Key stats per game",
          "Tracking history",
          "Add a game by Universe ID"
        ]}
      />
    </PageContainer>
  );
}
