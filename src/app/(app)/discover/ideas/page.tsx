import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Game Ideas" };

export default function GameIdeasPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Game Ideas"
        eyebrow="Market Intelligence"
        description="The five strongest game ideas of the week, and your saved library."
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Top 5 ideas of the week",
          "Detailed idea sheets",
          "Save idea",
          "Saved ideas library",
          "Your own ideas"
        ]}
      />
    </PageContainer>
  );
}
