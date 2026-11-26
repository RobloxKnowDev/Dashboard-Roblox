import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { RequireRole } from "@/components/layout/session-widgets";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Members" };

export default function MembersSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="members" />
      <RequireRole min="admin">
        <PlannedPage
          milestone="Milestone D"
          sections={[
            "Member list with roles",
            "Invite by email",
            "Change a member's role (Owner only)",
            "Remove a member",
          ]}
        />
      </RequireRole>
    </>
  );
}
