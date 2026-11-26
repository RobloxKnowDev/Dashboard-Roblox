import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Members" };

export default function MembersSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="members" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Member list with roles",
          "Invite by email",
          "Change a member's role (Owner only)",
          "Remove a member",
        ]}
      />
    </>
  );
}
