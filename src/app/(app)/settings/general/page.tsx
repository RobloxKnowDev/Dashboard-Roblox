import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/layout/session-widgets";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { siteConfig } from "@/config/site";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { GeneralSettingsForm } from "@/features/settings/settings-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "General settings" };

async function GeneralSection() {
  const supabase = await createClient();
  const { data } = await supabase.from("studio_settings").select("studio_name, devex_rate_usd").maybeSingle();
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <GeneralSettingsForm defaults={{ studioName: data?.studio_name ?? "", devexRate: String(data?.devex_rate_usd ?? 0.0038) }} />
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-fg">Fixed for now</h3>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">Currency</dt>
            <dd className="text-fg-2">{siteConfig.currency}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">Dates and daily figures</dt>
            <dd className="text-fg-2">UTC</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-fg-3">
          Roblox reports its analytics per UTC day, so every daily figure in the dashboard uses UTC.
        </p>
      </Card>
    </div>
  );
}

export default function GeneralSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="general" />
      <RequireRole min="admin">
        <Suspense fallback={<Skeleton className="h-56 rounded-lg" />}>
          <GeneralSection />
        </Suspense>
      </RequireRole>
    </>
  );
}
