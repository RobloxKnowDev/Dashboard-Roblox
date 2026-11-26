import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { IntegrationsOverview } from "@/features/settings/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader title="Integrations" eyebrow="System" description="Connections to Roblox, Claude and the database — live status." />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          }
        >
          <IntegrationsOverview />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
