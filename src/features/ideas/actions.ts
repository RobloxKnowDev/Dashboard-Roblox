"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema } from "./schemas";

/** Creates (no id) or updates an idea of the library. Developer+. */
export async function saveIdea(input: unknown, ideaId?: string): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.ideas.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbiddenEdit(t.common.roles.developer) };
  // Field errors are dictionary keys (ideas.validation.*), translated by the form.
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (ideaId !== undefined && !z.uuid().safeParse(ideaId).success) return { ok: false, message: m.invalid };

  const v = parsed.data;
  const record = {
    title: v.title,
    pitch: v.pitch || null,
    genre: v.genre || null,
    target_audience: v.targetAudience || null,
    core_loop: v.coreLoop || null,
    monetization: v.monetization || null,
    score: v.score === "" ? null : Number(v.score),
  };

  const supabase = await createClient();
  const { error } = ideaId
    ? await supabase.from("game_ideas").update(record).eq("id", ideaId)
    : await supabase.from("game_ideas").insert({ ...record, origin: "manual", status: "saved", created_by: access.user.id });
  if (error) return { ok: false, message: m.saveFailed };
  refresh();
  return { ok: true, message: ideaId ? m.updated : m.savedToLibrary };
}

export async function setIdeaArchived(ideaId: string, archived: boolean): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.ideas.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbiddenEdit(t.common.roles.developer) };
  if (!z.uuid().safeParse(ideaId).success) return { ok: false, message: m.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("game_ideas").update({ status: archived ? "archived" : "saved" }).eq("id", ideaId);
  if (error) return { ok: false, message: m.updateFailed };
  refresh();
  return { ok: true, message: archived ? m.archived : m.restored };
}

/** RLS: administrators, or the member who created it. */
export async function deleteIdea(ideaId: string): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.ideas.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbiddenDelete(t.common.roles.developer) };
  if (!z.uuid().safeParse(ideaId).success) return { ok: false, message: m.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.from("game_ideas").delete().eq("id", ideaId).select("id");
  if (error) return { ok: false, message: m.deleteFailed };
  if (!data?.length) return { ok: false, message: m.deleteForbidden };
  refresh();
  return { ok: true, message: m.deleted };
}
