import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/* LIVE: projects, their members and task counts (Supabase, RLS). */

type ProjectStatus = Database["public"]["Enums"]["project_status"];

export type MemberRef = { id: string; name: string; avatarUrl: string | null; profileId: string | null };

export type ProjectItem = {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: ProjectStatus;
  progress: number;
  targetReleaseDate: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  game: { id: string; name: string; iconUrl: string | null } | null;
  members: MemberRef[];
  tasks: { open: number; done: number };
};

const PROJECT_SELECT =
  "id, name, description, cover_image_url, status, progress, target_release_date, completed_at, created_at, created_by, game:games(id, name, thumbnail_url), project_members(team_member:team_members(id, display_name, avatar_url, profile_id))";

type ProjectRowWithRelations = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: ProjectStatus;
  progress: number;
  target_release_date: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  game: { id: string; name: string; thumbnail_url: string | null } | null;
  project_members: { team_member: { id: string; display_name: string; avatar_url: string | null; profile_id: string | null } | null }[];
};

function toItem(row: ProjectRowWithRelations, taskCounts: Map<string, { open: number; done: number }>): ProjectItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    progress: row.progress,
    targetReleaseDate: row.target_release_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    game: row.game ? { id: row.game.id, name: row.game.name, iconUrl: row.game.thumbnail_url } : null,
    members: row.project_members
      .map((pm) => pm.team_member)
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => ({ id: m.id, name: m.display_name, avatarUrl: m.avatar_url, profileId: m.profile_id }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tasks: taskCounts.get(row.id) ?? { open: 0, done: 0 },
  };
}

async function taskCountsByProject(projectIds: string[]) {
  const counts = new Map<string, { open: number; done: number }>();
  if (projectIds.length === 0) return counts;
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("project_id, status").in("project_id", projectIds);
  for (const task of data ?? []) {
    if (!task.project_id || task.status === "cancelled") continue;
    const entry = counts.get(task.project_id) ?? { open: 0, done: 0 };
    if (task.status === "done") entry.done += 1;
    else entry.open += 1;
    counts.set(task.project_id, entry);
  }
  return counts;
}

export const listProjects = cache(async (): Promise<ProjectItem[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false });
  if (error) return null;
  const rows = data as unknown as ProjectRowWithRelations[];
  const counts = await taskCountsByProject(rows.map((r) => r.id));
  return rows.map((row) => toItem(row, counts));
});

/** undefined = not found, null = query failed. */
export const getProject = cache(async (id: string): Promise<ProjectItem | undefined | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error) return null;
  if (!data) return undefined;
  const row = data as unknown as ProjectRowWithRelations;
  return toItem(row, await taskCountsByProject([row.id]));
});

/** Options for the member and game pickers. */
export const getProjectFormOptions = cache(async () => {
  const supabase = await createClient();
  const [members, games] = await Promise.all([
    supabase.from("team_members").select("id, display_name, avatar_url").eq("status", "active").order("display_name"),
    supabase.from("games").select("id, name").order("name"),
  ]);
  return {
    members: (members.data ?? []).map((m) => ({ id: m.id, name: m.display_name, avatarUrl: m.avatar_url })),
    games: (games.data ?? []).map((g) => ({ id: g.id, name: g.name })),
  };
});
