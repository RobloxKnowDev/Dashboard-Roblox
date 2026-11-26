"use server";

import { redirect } from "next/navigation";
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
    if (error.status === 429) {
      return { status: "error", message: "Too many attempts. Wait a few minutes and try again." };
    }
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "This account hasn't been confirmed yet. Check your inbox." };
    }
    return { status: "error", message: "Invalid email or password." };
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

  if (error?.status === 429) {
    return { status: "error", message: "Too many requests. Wait a few minutes before asking for another link." };
  }

  return {
    status: "success",
    message: "If an account exists for this address, a reset link is on its way. It expires in one hour.",
  };
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

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { status: "error", message: "Your reset link has expired. Ask for a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { password: "Choose a password different from your current one." } };
    }
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: "This password is too weak. Make it longer or less common." } };
    }
    return { status: "error", message: "The password couldn't be updated. Try again." };
  }

  redirect("/overview");
}

/** Ends the session on this device. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
