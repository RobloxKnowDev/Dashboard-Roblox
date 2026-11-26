import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "My Games" };

export default function MyGamesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Games"
        eyebrow="Development"
        description="Every experience published by the studio."
        actions={
          <ComingSoonButton variant="primary">
            <Plus aria-hidden />
            Add game
          </ComingSoonButton>
        }
      />
      <PlannedPage
        milestone="Milestone C"
        sections={[
          "Game cards with thumbnail and status",
          "Universe ID",
          "Live public stats: CCU, visits, favorites",
          "Detail page per game",
          "Analytics, revenue and retention (Phase 2)",
          "Game alerts"
        ]}
      />
    </PageContainer>
  );
}
