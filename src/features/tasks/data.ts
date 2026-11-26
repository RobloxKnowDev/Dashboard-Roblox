import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/* LIVE: tasks (Supabase, RLS). Filtering lives in ./filter.ts (pure, unit-tested). */
export { filterTasks, type TaskFilters } from "./filter";

type Enums = Database["public"]["Enums"];

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: Enums["task_priority"];
  status: Enums["task_status"];
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null; profileId: string | null } | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: Enums["task_priority"];
  status: Enums["task_status"];
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; display_name: string; avatar_url: string | null; profile_id: string | null } | null;
};

const TASK_SELECT =
  "id, title, description, priority, status, due_date, completed_at, created_at, created_by, project:projects(id, name), assignee:team_members(id, display_name, avatar_url, profile_id)";

export const listTasks = cache(async (): Promise<TaskItem[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select(TASK_SELECT).order("created_at", { ascending: false });
  if (error) return null;
  return (data as unknown as TaskRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_date,
    completedAt: t.completed_at,
    createdAt: t.created_at,
    createdBy: t.created_by,
    project: t.project,
    assignee: t.assignee
      ? { id: t.assignee.id, name: t.assignee.display_name, avatarUrl: t.assignee.avatar_url, profileId: t.assignee.profile_id }
      : null,
  }));
});

export const getTaskFormOptions = cache(async () => {
  const supabase = await createClient();
  const [projects, members] = await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("team_members").select("id, display_name, avatar_url").eq("status", "active").order("display_name"),
  ]);
  return {
    projects: (projects.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    members: (members.data ?? []).map((m) => ({ id: m.id, name: m.display_name, avatarUrl: m.avatar_url })),
  };
});
