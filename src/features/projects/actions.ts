"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, slugify, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "./schemas";

const idSchema = z.uuid();

/** Creates (no id) or updates a project, then syncs its members. Developer+. */
export async function saveProject(input: unknown, projectId?: string): Promise<ActionResult<{ id: string }>> {
  const t = (await getRequestT()).projects.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: t.forbiddenEdit };

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const values = parsed.data;

  if (projectId !== undefined && !idSchema.safeParse(projectId).success) return { ok: false, message: t.invalid };

  const supabase = await createClient();
  const record = {
    name: values.name,
    description: values.description || null,
    cover_image_url: values.coverImageUrl || null,
    status: values.status,
    progress: values.status === "completed" ? 100 : values.progress,
    target_release_date: values.targetReleaseDate || null,
    game_id: values.gameId || null,
  };

  let id = projectId;
  if (id) {
    const { error } = await supabase.from("projects").update(record).eq("id", id);
    if (error) return { ok: false, message: t.saveFailed };
  } else {
    const slug = `${slugify(values.name) || "project"}-${randomBytes(3).toString("hex")}`;
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...record, slug, created_by: access.user.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: t.createFailed };
    id = data.id;
  }

  // Members: replace the set (delete removed, insert added).
  const { data: current } = await supabase.from("project_members").select("team_member_id").eq("project_id", id);
  const existing = new Set((current ?? []).map((m) => m.team_member_id));
  const wanted = new Set(values.memberIds);
  const toRemove = [...existing].filter((m) => !wanted.has(m));
  const toAdd = [...wanted].filter((m) => !existing.has(m));
  if (toRemove.length) await supabase.from("project_members").delete().eq("project_id", id).in("team_member_id", toRemove);
  if (toAdd.length) await supabase.from("project_members").insert(toAdd.map((team_member_id) => ({ project_id: id, team_member_id })));

  refresh();
  return { ok: true, data: { id }, message: projectId ? t.updated : t.created };
}

/** Deletes a project and its tasks (cascade). Administrators only. */
export async function deleteProject(projectId: string): Promise<ActionResult> {
  const t = (await getRequestT()).projects.actions;
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.forbiddenDelete };
  if (!idSchema.safeParse(projectId).success) return { ok: false, message: t.invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { ok: false, message: t.deleteFailed };
  refresh();
  return { ok: true, message: t.deleted };
}
