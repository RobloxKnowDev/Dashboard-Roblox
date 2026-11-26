"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { generalSettingsSchema, NOTIFICATION_PREFS } from "./general";

export async function updateGeneralSettings(input: unknown): Promise<ActionResult> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only owners and administrators can edit studio settings." };
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("studio_settings")
    .update({ studio_name: parsed.data.studioName, devex_rate_usd: Number(parsed.data.devexRate), updated_by: access.user.id })
    .eq("id", true);
  if (error) return { ok: false, message: "The settings couldn't be saved. Try again." };
  refresh();
  return { ok: true, message: "Settings saved" };
}

/** Turns one in-app notification on or off for the signed-in user. */
export async function setNotificationPref(key: string, enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!NOTIFICATION_PREFS.some((p) => p.key === key) || typeof enabled !== "boolean") return { ok: false, message: "Unknown setting." };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("notification_prefs").eq("id", user.id).single();
  const current = profile?.notification_prefs && typeof profile.notification_prefs === "object" && !Array.isArray(profile.notification_prefs) ? profile.notification_prefs : {};
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: { ...current, [key]: enabled } })
    .eq("id", user.id);
  if (error) return { ok: false, message: "The preference couldn't be saved." };
  return { ok: true, message: enabled ? "Notification turned on" : "Notification turned off" };
}

/** Signs out every other browser and device; this one stays signed in. */
export async function signOutOtherSessions(): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, message: "Other sessions couldn't be signed out. Try again." };
  return { ok: true, message: "Other sessions signed out" };
}

/** Signs out everywhere, including here. */
export async function signOutEverywhere(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
