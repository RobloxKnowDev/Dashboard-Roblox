"use server";

import { redirect } from "next/navigation";
import { getRequestT } from "@/i18n/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsOf,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  type FormState,
} from "./schemas";

/** Email + password sign-in. Errors never reveal whether the account exists. */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const t = await getRequestT();
    if (error.status === 429) {
      return { status: "error", message: t.auth.errors.tooManyAttempts };
    }
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: t.auth.errors.notConfirmed };
    }
    return { status: "error", message: t.auth.errors.invalidCredentials };
  }

  redirect(safeNextPath(parsed.data.next));
}

/**
 * Sends a password reset email. Always answers with the same message so the
 * form can't be used to discover which emails have an account.
 */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  const t = await getRequestT();
  if (error?.status === 429) {
    return { status: "error", message: t.auth.errors.tooManyRequests };
  }

  return { status: "success", message: t.auth.errors.resetSent };
}

/** Sets a new password for the user signed in through a recovery link. */
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const t = await getRequestT();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { status: "error", message: t.auth.errors.resetExpired };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { password: t.auth.errors.samePassword } };
    }
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: t.auth.errors.weakPassword } };
    }
    return { status: "error", message: t.auth.errors.updateFailed };
  }

  redirect("/overview");
}

/** Ends the session on this device. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
