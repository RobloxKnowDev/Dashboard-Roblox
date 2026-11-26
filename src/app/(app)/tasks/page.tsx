import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Tasks"
        eyebrow="Development"
        description="Who does what, by when."
        actions={
          <ComingSoonButton variant="primary">
            <Plus aria-hidden />
            New task
          </ComingSoonButton>
        }
      />
      <PlannedPage
        milestone="Milestone C"
        sections={[
          "Views: All, My tasks, In progress, Completed",
          "Priorities: Low, Medium, High, Critical",
          "Project and assignee",
          "Due dates",
          "Filters and search"
        ]}
      />
    </PageContainer>
  );
}
