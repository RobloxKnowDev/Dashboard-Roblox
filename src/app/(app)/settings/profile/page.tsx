import type { Metadata } from "next";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { PasswordForm, ProfileForm } from "@/features/settings/profile-forms";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

async function ProfileSection() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="flex items-center gap-4 p-5 xl:col-span-2">
        <Avatar name={user.name} src={user.avatarUrl} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-3">{user.email}</p>
          <div className="mt-2">
            {user.role ? <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge> : <Badge tone="warning">Pending approval</Badge>}
          </div>
        </div>
      </Card>
      <ProfileForm defaults={{ fullName: profile?.full_name || user.name, avatarUrl: profile?.avatar_url ?? "" }} />
      <PasswordForm />
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
