"use server";

import { refresh } from "next/cache";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { passwordChangeSchema, profileSchema } from "./profile";

/** Updates the signed-in user's own name and avatar (RLS: own row only). */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const t = await getRequestT();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, avatar_url: parsed.data.avatarUrl || null })
    .eq("id", user.id);
  if (error) return { ok: false, message: t.settings.profile.saveFailed };
  refresh();
  return { ok: true, message: t.settings.profile.saved };
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const t = await getRequestT();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, fieldErrors: { password: t.auth.errors.samePassword } };
    if (error.code === "weak_password") return { ok: false, fieldErrors: { password: t.settings.profile.weakPassword } };
    if (error.code === "reauthentication_needed") {
      return { ok: false, message: t.settings.profile.reauthenticate };
    }
    return { ok: false, message: t.settings.profile.passwordFailed };
  }
  return { ok: true, message: t.settings.profile.passwordChanged };
}
