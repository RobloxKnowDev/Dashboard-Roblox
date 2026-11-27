import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorState, ListSkeleton } from "@/components/feedback/states";
import { RequireRole } from "@/components/layout/session-widgets";
import { AccountsPanel, CreateAccountModal } from "@/features/members/accounts-panel";
import { listAccounts } from "@/features/members/data";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.members };
}

async function Accounts() {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return null;
  const accounts = await listAccounts();
  await connection();
  const nowIso = new Date().toISOString();
  const t = await getT();
  if (accounts === null) return <ErrorState description={t.settings.members.loadError} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg-3">{t.settings.members.count(accounts.length)}</p>
        <CreateAccountModal managerRole={access.user.role} />
      </div>
      <AccountsPanel accounts={accounts} viewer={{ id: access.user.id, role: access.user.role }} nowIso={nowIso} />
    </div>
  );
}

export default function MembersSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="members" />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="rounded-lg border border-line bg-surface">
              <ListSkeleton rows={3} />
            </div>
          }
        >
          <Accounts />
        </Suspense>
      </RequireRole>
    </>
  );
}
