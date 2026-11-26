"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema } from "./schemas";

/** Creates (no id) or updates an idea of the library. Developer+. */
export async function saveIdea(input: unknown, ideaId?: string): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to edit ideas." };
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (ideaId !== undefined && !z.uuid().safeParse(ideaId).success) return { ok: false, message: "Invalid idea." };

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
  if (error) return { ok: false, message: "The idea couldn't be saved. Try again." };
  refresh();
  return { ok: true, message: ideaId ? "Idea updated" : "Idea saved to the library" };
}

export async function setIdeaArchived(ideaId: string, archived: boolean): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to edit ideas." };
  if (!z.uuid().safeParse(ideaId).success) return { ok: false, message: "Invalid idea." };
  const supabase = await createClient();
  const { error } = await supabase.from("game_ideas").update({ status: archived ? "archived" : "saved" }).eq("id", ideaId);
  if (error) return { ok: false, message: "The idea couldn't be updated." };
  refresh();
  return { ok: true, message: archived ? "Idea archived" : "Idea restored" };
}

/** RLS: administrators, or the member who created it. */
export async function deleteIdea(ideaId: string): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to delete ideas." };
  if (!z.uuid().safeParse(ideaId).success) return { ok: false, message: "Invalid idea." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("game_ideas").delete().eq("id", ideaId).select("id");
  if (error) return { ok: false, message: "The idea couldn't be deleted." };
  if (!data?.length) return { ok: false, message: "Only administrators or the idea's author can delete it." };
  refresh();
  return { ok: true, message: "Idea deleted" };
}
