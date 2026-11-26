import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoonPanel } from "@/components/feedback/coming-soon";
import { Skeleton } from "@/components/ui/primitives";
import { NOTIFICATION_PREFS, type NotificationPrefKey } from "@/features/settings/general";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { NotificationPreferences } from "@/features/settings/settings-forms";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

async function Preferences() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("notification_prefs").eq("id", user.id).maybeSingle();
  const stored = (data?.notification_prefs ?? {}) as Record<string, unknown>;
  const initial = Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, stored[p.key] !== false])) as Record<NotificationPrefKey, boolean>;
  return <NotificationPreferences initial={initial} />;
}

export default function NotificationsSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="notifications" />
      <div className="space-y-4">
        <p className="text-[13px] text-fg-3">
          In-app notifications appear under the bell in the top bar. Changes you make yourself never notify you.
        </p>
        <Suspense fallback={<Skeleton className="h-36 rounded-lg" />}>
          <Preferences />
        </Suspense>
        <ComingSoonPanel
          title="More notifications"
          description="Game alerts (drops in players or revenue), AI agent errors, a weekly market digest and email delivery."
        />
      </div>
    </>
  );
}
