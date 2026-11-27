"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { generalSettingsSchema, NOTIFICATION_PREFS } from "./general";

export async function updateGeneralSettings(input: unknown): Promise<ActionResult> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.settings.general.adminOnly };
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("studio_settings")
    .update({ studio_name: parsed.data.studioName, devex_rate_usd: Number(parsed.data.devexRate), updated_by: access.user.id })
    .eq("id", true);
  if (error) return { ok: false, message: t.settings.general.saveFailed };
  refresh();
  return { ok: true, message: t.settings.general.saved };
}

/** Turns one in-app notification on or off for the signed-in user. */
export async function setNotificationPref(key: string, enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getRequestT();
  if (!NOTIFICATION_PREFS.some((p) => p.key === key) || typeof enabled !== "boolean") {
    return { ok: false, message: t.settings.notifications.unknown };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("notification_prefs").eq("id", user.id).single();
  const current = profile?.notification_prefs && typeof profile.notification_prefs === "object" && !Array.isArray(profile.notification_prefs) ? profile.notification_prefs : {};
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: { ...current, [key]: enabled } })
    .eq("id", user.id);
  if (error) return { ok: false, message: t.settings.notifications.failed };
  return { ok: true, message: enabled ? t.settings.notifications.turnedOn : t.settings.notifications.turnedOff };
}

/** Signs out every other browser and device; this one stays signed in. */
export async function signOutOtherSessions(): Promise<ActionResult> {
  await requireUser();
  const t = await getRequestT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, message: t.settings.security.othersFailed };
  return { ok: true, message: t.settings.security.othersDone };
}

/** Signs out everywhere, including here. */
export async function signOutEverywhere(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
