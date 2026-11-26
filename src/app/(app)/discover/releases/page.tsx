import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Weekly Releases" };

export default function WeeklyReleasesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Weekly Releases"
        eyebrow="Market Intelligence"
        description="Experiences published this week, with their early traction."
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Release list with thumbnails",
          "Genre and publish date",
          "Early stats: CCU, visits, favorites",
          "Week-over-week evolution",
          "Filters and search"
        ]}
      />
    </PageContainer>
  );
}
