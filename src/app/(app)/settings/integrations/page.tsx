import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { IntegrationsOverview } from "@/features/settings/integrations";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="integrations" />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          }
        >
          <IntegrationsOverview />
        </Suspense>
      </RequireRole>
    </>
  );
}
