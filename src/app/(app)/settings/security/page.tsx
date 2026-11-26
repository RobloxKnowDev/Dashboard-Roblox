import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="security" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Two-factor authentication (TOTP) — prepared, enabled later",
          "Active sessions",
          "Sign out everywhere",
          "Change your password: Settings → Profile",
        ]}
      />
    </>
  );
}
