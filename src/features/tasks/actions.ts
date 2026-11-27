"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/types/database";
import { taskSchema } from "./schemas";

const idSchema = z.uuid();
const statusSchema = z.enum(Constants.public.Enums.task_status);

/** Creates (no id) or updates a task. Developer+. */
export async function saveTask(input: unknown, taskId?: string): Promise<ActionResult> {
  const t = (await getRequestT()).tasks.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: t.forbiddenEdit };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (taskId !== undefined && !idSchema.safeParse(taskId).success) return { ok: false, message: t.invalid };

  const v = parsed.data;
  const record = {
    title: v.title,
    description: v.description || null,
    project_id: v.projectId || null,
    assignee_id: v.assigneeId || null,
    priority: v.priority,
    status: v.status,
    due_date: v.dueDate || null,
  };

  const supabase = await createClient();
  const { error } = taskId
    ? await supabase.from("tasks").update(record).eq("id", taskId)
    : await supabase.from("tasks").insert({ ...record, created_by: access.user.id });
  if (error) return { ok: false, message: t.saveFailed };

  refresh();
  return { ok: true, message: taskId ? t.updated : t.created };
}

/** Quick status change from the task list. Developer+. */
export async function setTaskStatus(taskId: string, status: string): Promise<ActionResult> {
  const t = (await getRequestT()).tasks.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: t.forbiddenStatus };
  const id = idSchema.safeParse(taskId);
  const next = statusSchema.safeParse(status);
  if (!id.success || !next.success) return { ok: false, message: t.invalidRequest };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status: next.data }).eq("id", id.data);
  if (error) return { ok: false, message: t.statusFailed };
  refresh();
  return { ok: true };
}

/** Deletes a task. RLS allows administrators, or the developer who created it. */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const t = (await getRequestT()).tasks.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: t.forbiddenDelete };
  if (!idSchema.safeParse(taskId).success) return { ok: false, message: t.invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).select("id");
  if (error) return { ok: false, message: t.deleteFailed };
  if (!data?.length) return { ok: false, message: t.deleteNotAllowed };
  refresh();
  return { ok: true, message: t.deleted };
}
