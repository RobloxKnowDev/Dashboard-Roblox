import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        description="Studio health at a glance — revenue, players, projects and agents."
      />
      <PlannedPage
        milestone="Milestone B"
        sections={[
          "Key indicators: revenue, CCU, DAU, games, projects, agents, tasks",
          "Revenue overview",
          "CCU overview",
          "Game performance",
          "Studio growth",
          "Recent activity",
          "Active agents",
          "Upcoming tasks",
          "Market highlights",
          "Important alerts",
          "Time range filters (7d · 30d · 90d · 12m)"
        ]}
      />
    </PageContainer>
  );
}
