import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingState } from "@/components/feedback/states";
import { buttonStyles } from "@/components/ui/button";
import { AuthHeading, FormMessage } from "@/features/auth/form-parts";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { getT } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.auth.reset.metaTitle };
}

/** Only reachable through a recovery link, which signs the user in first. */
async function ResetPasswordGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    const t = await getT();
    return (
      <>
        <AuthHeading title={t.auth.reset.expiredTitle} />
        <div className="space-y-4">
          <FormMessage tone="error">{t.auth.reset.expiredBody}</FormMessage>
          <Link href="/forgot-password" className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}>
            {t.auth.reset.askNewLink}
          </Link>
        </div>
      </>
    );
  }

  return <ResetPasswordForm />;
}

export default async function ResetPasswordPage() {
  const t = await getT();
  return (
    <Suspense fallback={<LoadingState label={t.auth.reset.checkingLink} />}>
      <ResetPasswordGate />
    </Suspense>
  );
}
