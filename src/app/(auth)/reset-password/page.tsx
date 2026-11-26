import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingState } from "@/components/feedback/states";
import { buttonStyles } from "@/components/ui/button";
import { AuthHeading, FormMessage } from "@/features/auth/form-parts";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

/** Only reachable through a recovery link, which signs the user in first. */
async function ResetPasswordGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    return (
      <>
        <AuthHeading title="Link expired" />
        <div className="space-y-4">
          <FormMessage tone="error">This reset link is invalid or has expired. Reset links work once, for one hour.</FormMessage>
          <Link href="/forgot-password" className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}>
            Ask for a new link
          </Link>
        </div>
      </>
    );
  }

  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState label="Checking your link…" />}>
      <ResetPasswordGate />
    </Suspense>
  );
}
