import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonPanel } from "@/components/feedback/coming-soon";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { SessionControls } from "@/features/settings/settings-forms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.security };
}

export default async function SecuritySettingsPage() {
  const t = await getT();
  return (
    <>
      <SettingsSectionHeader slug="security" />
      <div className="space-y-4">
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium text-fg">{t.settings.security.passwordTitle}</p>
            <p className="text-xs text-fg-3">{t.settings.security.passwordBody}</p>
          </div>
          <Link href="/settings/profile" className={buttonStyles({ variant: "secondary" })}>
            <KeyRound aria-hidden />
            {t.settings.security.changePassword}
          </Link>
        </Card>
        <SessionControls />
        <ComingSoonPanel title={t.settings.security.twoFactorTitle} description={t.settings.security.twoFactorDescription} />
      </div>
    </>
  );
}
