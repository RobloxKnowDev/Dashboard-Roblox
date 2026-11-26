import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/planned-page";
import { RequireRole } from "@/components/layout/session-widgets";
import { SettingsSectionHeader } from "@/features/settings/section-header";

export const metadata: Metadata = { title: "API configuration" };

export default function ApiSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="api" />
      <RequireRole min="owner">
        <PlannedPage
          milestone="Milestone D"
          sections={[
            "Key status: configured or missing — never displayed",
            "Environment variables checklist",
            "Agent ingestion tokens (Phase 2)",
          ]}
        />
      </RequireRole>
    </>
  );
}
