import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { RequireRole } from "@/components/layout/session-widgets";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Integration settings" };

export default function IntegrationsSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="integrations" />
      <RequireRole min="admin">
        <PlannedPage
          milestone="Milestone D"
          sections={[
            "Roblox public stats",
            "Roblox Open Cloud API key (Phase 2)",
            "Claude API key (Phase 2)",
            "Sync schedule",
          ]}
        />
      </RequireRole>
    </>
  );
}
