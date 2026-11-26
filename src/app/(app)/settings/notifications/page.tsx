import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "Notification settings" };

export default function NotificationSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="notifications" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Task assignments",
          "Agent errors",
          "Game alerts",
          "Weekly market digest",
        ]}
      />
    </>
  );
}
