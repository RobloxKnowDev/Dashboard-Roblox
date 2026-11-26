import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Team"
        eyebrow="Business"
        description="The people behind the studio."
        actions={
          <ComingSoonButton variant="primary">
            <UserPlus aria-hidden />
            Invite member
          </ComingSoonButton>
        }
      />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Members with avatar and role",
          "Associated projects",
          "Assigned tasks",
          "Recent activity",
          "Permission levels"
        ]}
      />
    </PageContainer>
  );
}
