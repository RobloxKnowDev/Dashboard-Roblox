import type { Metadata } from "next";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { AssistantChat } from "@/features/assistant/chat";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <PageContainer>
      <PageHeader
        title="AI Assistant"
        eyebrow="Intelligence"
        description="Ask questions about your studio — games, projects, finances and the market."
      />
      <DemoBanner>
        The assistant isn&apos;t connected to Claude yet: answers are illustrative examples with fictional games, and
        conversations aren&apos;t saved. Once connected, it will answer from your real studio data.
      </DemoBanner>
      <AssistantChat />
    </PageContainer>
  );
}
