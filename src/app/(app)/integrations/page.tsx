import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";
import { RequireRole } from "@/components/layout/session-widgets";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        eyebrow="System"
        description="Connections to Roblox and Claude."
      />
      <RequireRole min="admin">
        <PlannedPage
          milestone="Milestone D"
          sections={[
            "Roblox public stats (no key required)",
            "Roblox Open Cloud analytics (Phase 2)",
            "Claude assistant (Phase 2)",
            "Connection status and last sync"
          ]}
        />
      </RequireRole>
    </PageContainer>
  );
}
