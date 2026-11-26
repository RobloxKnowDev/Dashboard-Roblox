import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "General settings" };

export default function GeneralSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="general" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Studio name",
          "Reference currency (USD)",
          "Timezone",
          "Robux → USD DevEx rate",
        ]}
      />
    </>
  );
}
