import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "API configuration" };

export default function ApiSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="api" />
      <PlannedPage
        milestone="Milestone D"
        sections={[
          "Key status: configured or missing — never displayed",
          "Environment variables checklist",
          "Agent ingestion tokens (Phase 2)",
        ]}
      />
    </>
  );
}
