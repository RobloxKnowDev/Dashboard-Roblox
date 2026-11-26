import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Integration settings" };

export default function IntegrationsSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="integrations" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Roblox public stats",
          "Roblox Open Cloud API key (Phase 2)",
          "Claude API key (Phase 2)",
          "Sync schedule",
        ]}
      />
    </>
  );
}
