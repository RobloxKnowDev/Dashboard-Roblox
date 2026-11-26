import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <PageContainer>
      <PageHeader
        title="AI Assistant"
        eyebrow="Intelligence"
        description="Ask questions about your studio — games, projects, finances."
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Conversation history",
          "Chat interface",
          "Generation indicator",
          "Formatted answers",
          "Questions about studio data"
        ]}
      />
    </PageContainer>
  );
}
