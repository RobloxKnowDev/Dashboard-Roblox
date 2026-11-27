import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/layout/session-widgets";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { siteConfig } from "@/config/site";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { GeneralSettingsForm } from "@/features/settings/settings-forms";
import { getT } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.general };
}

async function GeneralSection() {
  const t = await getT();
  const supabase = await createClient();
  const { data } = await supabase.from("studio_settings").select("studio_name, devex_rate_usd").maybeSingle();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_20rem]">
      <GeneralSettingsForm defaults={{ studioName: data?.studio_name ?? "", devexRate: String(data?.devex_rate_usd ?? 0.0038) }} />
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-fg">{t.settings.general.fixedTitle}</h3>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">{t.settings.general.currency}</dt>
            <dd className="text-fg-2">{siteConfig.currency}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">{t.settings.general.dates}</dt>
            <dd className="text-fg-2">UTC</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-fg-3">{t.settings.general.utcNote}</p>
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
