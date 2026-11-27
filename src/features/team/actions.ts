"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { memberSchema } from "./schemas";

const idSchema = z.uuid();

/** Creates (no id) or updates a team member card. Administrators and owners. */
export async function saveMember(input: unknown, memberId?: string): Promise<ActionResult<{ id: string }>> {
  const t = (await getRequestT()).team.actions;
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.forbidden };
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (memberId !== undefined && !idSchema.safeParse(memberId).success) return { ok: false, message: t.invalid };
  const v = parsed.data;

  const record = {
    display_name: v.displayName,
    studio_role: v.studioRole || null,
    status: v.status,
    avatar_url: v.avatarUrl || null,
    joined_at: v.joinedAt,
  };
  const supabase = await createClient();
  if (memberId) {
    const { error } = await supabase.from("team_members").update(record).eq("id", memberId);
    if (error) return { ok: false, message: t.saveFailed };
    refresh();
    return { ok: true, data: { id: memberId }, message: t.updated };
  }
  const { data, error } = await supabase.from("team_members").insert(record).select("id").single();
  if (error || !data) return { ok: false, message: t.addFailed };
  refresh();
  return { ok: true, data: { id: data.id }, message: t.added };
}

/** Deletes a member without an account (accounts are removed in Settings → Members). */
export async function deleteMember(memberId: string): Promise<ActionResult> {
  const t = (await getRequestT()).team.actions;
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.forbidden };
  if (!idSchema.safeParse(memberId).success) return { ok: false, message: t.invalid };

  const supabase = await createClient();
  const { data: member } = await supabase.from("team_members").select("profile_id").eq("id", memberId).maybeSingle();
  if (!member) return { ok: false, message: t.notFound };
  if (member.profile_id) return { ok: false, message: t.hasAccount };
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { ok: false, message: t.deleteFailed };
  refresh();
  return { ok: true, message: t.deleted };
}
