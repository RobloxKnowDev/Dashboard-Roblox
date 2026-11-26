import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "AI Agents" };

export default function AgentsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="AI Agents"
        eyebrow="Development"
        description="Live status of every AI agent working for the studio."
      />
      <PlannedPage
        milestone="Milestone C"
        sections={[
          "Status overview: Working, Waiting, Completed, Error, Offline",
          "Agent cards with mission and project",
          "Start time and last activity",
          "Detailed event history",
          "Error highlighting"
        ]}
      />
    </PageContainer>
  );
}
