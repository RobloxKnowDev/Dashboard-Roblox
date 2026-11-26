import "server-only";
import { cache } from "react";
import type { AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

/*
 * LIVE: studio members (Supabase, RLS). A member may be linked to an account
 * (access comes from its profile role) or describe someone without one
 * (freelancer, contractor) who can still be assigned projects and tasks.
 */

export type MemberStatus = Enums<"member_status">;
type ProjectStatus = Enums<"project_status">;

export type TeamMember = {
  id: string;
  profileId: string | null;
  name: string;
  avatarUrl: string | null;
  studioRole: string | null;
  status: MemberStatus;
  joinedAt: string;
  /** "none" = no account; null = account pending approval. */
  access: AppRole | null | "none";
  projects: { id: string; name: string; status: ProjectStatus }[];
  tasks: { open: number; done: number };
};

const SELECT =
  "id, profile_id, display_name, avatar_url, studio_role, status, joined_at, profile:profiles(role), project_members(project:projects(id, name, status))";

type Row = {
  id: string;
  profile_id: string | null;
  display_name: string;
  avatar_url: string | null;
  studio_role: string | null;
  status: MemberStatus;
  joined_at: string;
  profile: { role: AppRole | null } | null;
  project_members: { project: { id: string; name: string; status: ProjectStatus } | null }[];
};

async function taskCounts(memberIds: string[]) {
  const counts = new Map<string, { open: number; done: number }>();
  if (memberIds.length === 0) return counts;
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("assignee_id, status").in("assignee_id", memberIds);
  for (const task of data ?? []) {
    if (!task.assignee_id || task.status === "cancelled") continue;
    const entry = counts.get(task.assignee_id) ?? { open: 0, done: 0 };
    if (task.status === "done") entry.done += 1;
    else entry.open += 1;
    counts.set(task.assignee_id, entry);
  }
  return counts;
}

function toMember(row: Row, counts: Map<string, { open: number; done: number }>): TeamMember {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.display_name,
    avatarUrl: row.avatar_url,
    studioRole: row.studio_role,
    status: row.status,
    joinedAt: row.joined_at,
    access: row.profile_id === null ? "none" : (row.profile?.role ?? null),
    projects: row.project_members
      .map((pm) => pm.project)
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
    tasks: counts.get(row.id) ?? { open: 0, done: 0 },
  };
}

const ACCESS_ORDER: Record<string, number> = { owner: 0, admin: 1, developer: 2, viewer: 3, pending: 4, none: 5 };

/** Active members first, then by access level and name. Null = query failed. */
export const listTeamMembers = cache(async (): Promise<TeamMember[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select(SELECT).order("display_name");
  if (error) return null;
  const rows = data as unknown as Row[];
  const counts = await taskCounts(rows.map((r) => r.id));
  return rows
    .map((row) => toMember(row, counts))
    .sort(
      (a, b) =>
        Number(a.status === "inactive") - Number(b.status === "inactive") ||
        (ACCESS_ORDER[a.access ?? "pending"] ?? 9) - (ACCESS_ORDER[b.access ?? "pending"] ?? 9) ||
        a.name.localeCompare(b.name),
    );
});

/** undefined = not found, null = query failed. */
export const getTeamMember = cache(async (id: string): Promise<TeamMember | undefined | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").select(SELECT).eq("id", id).maybeSingle();
  if (error) return null;
  if (!data) return undefined;
  return toMember(data as unknown as Row, await taskCounts([id]));
});
