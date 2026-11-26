import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        eyebrow="Development"
        description="Everything the studio is building — active and shipped."
        actions={
          <ComingSoonButton variant="primary">
            <Plus aria-hidden />
            New project
          </ComingSoonButton>
        }
      />
      <PlannedPage
        milestone="Milestone C"
        sections={[
          "Card view and table view",
          "Status and progress",
          "Project members",
          "Creation and target release dates",
          "Active and completed filters",
          "Project detail page"
        ]}
      />
    </PageContainer>
  );
}
