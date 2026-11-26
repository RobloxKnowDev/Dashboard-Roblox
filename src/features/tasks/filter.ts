import { TASK_PRIORITY } from "@/features/shared/status";
import type { TaskView } from "./schemas";

/** Minimal shape needed to filter and sort tasks. */
type FilterableTask = {
  title: string;
  description: string | null;
  priority: keyof typeof TASK_PRIORITY;
  status: string;
  dueDate: string | null;
  project: { id: string; name: string } | null;
  assignee: { profileId: string | null } | null;
};

export type TaskFilters = { view: TaskView; priority?: string; projectId?: string; q?: string };

/** Filters in memory — a studio has hundreds of tasks, not millions. */
export function filterTasks<T extends FilterableTask>(tasks: T[], filters: TaskFilters, userId: string): T[] {
  const q = filters.q?.trim().toLowerCase();
  return tasks
    .filter((t) => {
      if (filters.view === "mine" && (t.assignee?.profileId !== userId || t.status === "cancelled")) return false;
      if (filters.view === "in_progress" && t.status !== "in_progress" && t.status !== "in_review") return false;
      if (filters.view === "completed" && t.status !== "done") return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.projectId && t.project?.id !== filters.projectId) return false;
      if (q && !`${t.title} ${t.description ?? ""} ${t.project?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      // Open work first, then done, then cancelled; within a group by due date
      // (undated last), then priority.
      const group = (status: string) => (status === "cancelled" ? 2 : status === "done" ? 1 : 0);
      if (group(a.status) !== group(b.status)) return group(a.status) - group(b.status);
      if (a.dueDate !== b.dueDate) return (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1;
      return TASK_PRIORITY[b.priority].rank - TASK_PRIORITY[a.priority].rank;
    });
}

