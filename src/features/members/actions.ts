"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { checkAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createAccountSchema, grantableRoles, makeTemporaryPassword } from "./schemas";

/*
 * Account management. Every action checks the caller's role first; role
 * changes then go through the caller's own session so the database guard
 * (owner-only, never your own role, never the last owner) has the last word.
 * The secret-key client is used only for what RLS can't do: creating and
 * deleting Auth users and keeping app_metadata in sync.
 */

const idSchema = z.uuid();
const roleSchema = z.enum(APP_ROLES);

/** Creates a confirmed account with a temporary password (shown once, never stored). */
export async function createAccount(input: unknown): Promise<ActionResult<{ password: string; email: string }>> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only owners and administrators can create accounts." };
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { name, email, role } = parsed.data;
  if (!grantableRoles(access.user.role).includes(role)) {
    return { ok: false, fieldErrors: { role: "Only an owner can create owner or administrator accounts." } };
  }

  const password = makeTemporaryPassword((size) => randomBytes(size));
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: name },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return exists
      ? { ok: false, fieldErrors: { email: "An account already uses this email." } }
      : { ok: false, message: "The account couldn't be created. Try again." };
  }
  refresh();
  return { ok: true, data: { password, email }, message: "Account created" };
}

async function ownerTarget(profileId: string) {
  const access = await checkAccess("owner");
  if (access.status !== "allowed") return { error: "Only an owner can change access." } as const;
  if (!idSchema.safeParse(profileId).success) return { error: "Invalid account." } as const;
  if (profileId === access.user.id) return { error: "You can't change your own access." } as const;
  return { access } as const;
}

/** Message for the database guard's refusals. */
function guardMessage(message: string | undefined, fallback: string) {
  if (message?.includes("last owner")) return "The studio must keep at least one owner.";
  return fallback;
}

/** Sets the role of another account (also approves a pending one). Owners only. */
export async function changeRole(profileId: string, role: AppRole): Promise<ActionResult> {
  const target = await ownerTarget(profileId);
  if ("error" in target) return { ok: false, message: target.error };
  if (!roleSchema.safeParse(role).success) return { ok: false, message: "Invalid role." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", profileId).select("id");
  if (error || !data?.length) return { ok: false, message: guardMessage(error?.message, "The role couldn't be changed.") };
  // Keep app_metadata in sync (informational; the profile role is the source of truth).
  await createAdminClient().auth.admin.updateUserById(profileId, { app_metadata: { role } }).catch(() => undefined);
  refresh();
  return { ok: true, message: "Role updated" };
}

/** Removes all access but keeps the account (it can be approved again). Owners only. */
export async function revokeAccess(profileId: string): Promise<ActionResult> {
  const target = await ownerTarget(profileId);
  if ("error" in target) return { ok: false, message: target.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ role: null }).eq("id", profileId).select("id");
  if (error || !data?.length) return { ok: false, message: guardMessage(error?.message, "Access couldn't be revoked.") };
  await createAdminClient().auth.admin.updateUserById(profileId, { app_metadata: { role: null } }).catch(() => undefined);
  refresh();
  return { ok: true, message: "Access revoked" };
}

/**
 * Deletes the account for good. Their team card stays (marked inactive, no
 * account) so past projects and tasks keep their assignee. Owners only.
 */
export async function deleteAccount(profileId: string): Promise<ActionResult> {
  const target = await ownerTarget(profileId);
  if ("error" in target) return { ok: false, message: target.error };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (!profile) return { ok: false, message: "This account no longer exists." };
  if (profile.role === "owner") {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner");
    if ((count ?? 0) <= 1) return { ok: false, message: "The studio must keep at least one owner." };
  }

  await supabase.from("team_members").update({ status: "inactive" }).eq("profile_id", profileId);
  const { error } = await createAdminClient().auth.admin.deleteUser(profileId);
  if (error) return { ok: false, message: guardMessage(error.message, "The account couldn't be deleted.") };
  refresh();
  return { ok: true, message: "Account deleted" };
}
