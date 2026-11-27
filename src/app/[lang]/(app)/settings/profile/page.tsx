import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSelect } from "@/components/layout/language-switcher";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/primitives";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { PasswordForm, ProfileForm } from "@/features/settings/profile-forms";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.profile };
}

async function ProfileSection() {
  const user = await requireUser();
  const t = await getT();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="flex items-center gap-4 p-5 xl:col-span-2">
        <Avatar name={user.name} src={user.avatarUrl} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-3">{user.email}</p>
          <div className="mt-2">
            {user.role ? (
              <Badge tone="accent">{t.common.roles[user.role]}</Badge>
            ) : (
              <Badge tone="warning">{t.settings.profile.pendingApproval}</Badge>
            )}
          </div>
        </div>
      </Card>
      <ProfileForm defaults={{ fullName: profile?.full_name || user.name, avatarUrl: profile?.avatar_url ?? "" }} />
      <PasswordForm />
      <Card className="p-5 xl:col-span-2">
        <h3 className="text-[13px] font-semibold text-fg">{t.settings.profile.preferencesTitle}</h3>
        <p className="mt-0.5 text-xs text-fg-3">{t.settings.profile.preferencesDescription}</p>
        <div className="mt-4">
          <Field htmlFor="language" label={t.common.language.label} hint={t.settings.profile.languageHint}>
            <LanguageSelect id="language" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="profile" />
      <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
        <ProfileSection />
      </Suspense>
    </>
  );
}
