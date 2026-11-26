import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Profile" };

export default function ProfileSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="profile" />
      <PlannedPage
        milestone="Milestone B"
        sections={[
          "Display name",
          "Avatar",
          "Email address",
          "Change password",
        ]}
      />
    </>
  );
}
