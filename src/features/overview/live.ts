import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_STATUSES, PENDING_TASK_STATUSES } from "@/features/shared/status";
import type { Database } from "@/types/database";

/*
 * LIVE data for the Overview. Every query runs as the signed-in user
 * (cookie session), so RLS decides what comes back. Callers render under
 * <Suspense>. A failed query returns null — the UI shows an error state
 * instead of a misleading zero.
 */

export type StudioCounts = {
  games: { live: number; total: number } | null;
  projects: { active: number } | null;
  tasks: { pending: number; overdue: number } | null;
};

export async function getStudioCounts(today: string): Promise<StudioCounts> {
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };

  const [liveGames, allGames, activeProjects, pendingTasks, overdueTasks] = await Promise.all([
    supabase.from("games").select("id", count).eq("status", "live"),
    supabase.from("games").select("id", count).neq("status", "archived"),
    supabase.from("projects").select("id", count).in("status", ACTIVE_PROJECT_STATUSES),
    supabase.from("tasks").select("id", count).in("status", PENDING_TASK_STATUSES),
    supabase.from("tasks").select("id", count).in("status", PENDING_TASK_STATUSES).lt("due_date", today),
  ]);

  return {
    games: liveGames.error || allGames.error ? null : { live: liveGames.count ?? 0, total: allGames.count ?? 0 },
    projects: activeProjects.error ? null : { active: activeProjects.count ?? 0 },
    tasks:
      pendingTasks.error || overdueTasks.error
        ? null
        : { pending: pendingTasks.count ?? 0, overdue: overdueTasks.count ?? 0 },
  };
}

export type UpcomingTask = {
  id: string;
  title: string;
  priority: Database["public"]["Enums"]["task_priority"];
  status: Database["public"]["Enums"]["task_status"];
  dueDate: string | null;
  project: string | null;
  assignee: string | null;
};

/** Next pending tasks by due date (undated last). */
export async function getUpcomingTasks(limit = 6): Promise<UpcomingTask[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, priority, status, due_date, project:projects(name), assignee:team_members(display_name)")
    .in("status", PENDING_TASK_STATUSES)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .limit(limit);

  if (error) return null;
  return data.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    dueDate: task.due_date,
    project: task.project?.name ?? null,
    assignee: task.assignee?.display_name ?? null,
  }));
}

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityLabel: string | null;
  actor: string | null;
  createdAt: string;
  metadata: unknown;
};

/** Latest studio activity, optionally by one account (finance entries are filtered by RLS for non-admins). */
export async function getRecentActivity(limit = 8, actorId?: string): Promise<ActivityEntry[] | null> {
  const supabase = await createClient();
  let query = supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_label, metadata, created_at, actor:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (actorId) query = query.eq("actor_id", actorId);
  const { data, error } = await query;

  if (error) return null;
  return data.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entity_type,
    entityLabel: entry.entity_label,
    actor: entry.actor?.full_name?.trim() || entry.actor?.email?.split("@")[0] || null,
    createdAt: entry.created_at,
    metadata: entry.metadata,
  }));
}
