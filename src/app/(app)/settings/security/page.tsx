import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonPanel } from "@/components/feedback/coming-soon";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { SessionControls } from "@/features/settings/settings-forms";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="security" />
      <div className="space-y-4">
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium text-fg">Password</p>
            <p className="text-xs text-fg-3">Change it from your profile. If you forgot it, use “Forgot password” on the sign-in page.</p>
          </div>
          <Link href="/settings/profile" className={buttonStyles({ variant: "secondary" })}>
            <KeyRound aria-hidden />
            Change password
          </Link>
        </Card>
        <SessionControls />
        <ComingSoonPanel
          title="Two-factor authentication"
          description="Codes from an authenticator app (TOTP) at sign-in. Accounts are ready for it; enrollment will be switched on in a later phase."
        />
      </div>
    </>
  );
}
