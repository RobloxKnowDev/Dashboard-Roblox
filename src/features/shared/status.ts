import type { BadgeTone } from "@/components/ui/badge";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

type StatusMeta = { label: string; tone: BadgeTone };

/** Presentation of each enum value — one place, reused by every page. */
export const TASK_PRIORITY: Record<Enums["task_priority"], StatusMeta & { rank: number }> = {
  low: { label: "Low", tone: "neutral", rank: 0 },
  medium: { label: "Medium", tone: "info", rank: 1 },
  high: { label: "High", tone: "warning", rank: 2 },
  critical: { label: "Critical", tone: "critical", rank: 3 },
};

export const TASK_STATUS: Record<Enums["task_status"], StatusMeta> = {
  todo: { label: "To do", tone: "neutral" },
  in_progress: { label: "In progress", tone: "accent" },
  in_review: { label: "In review", tone: "info" },
  done: { label: "Done", tone: "good" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const PENDING_TASK_STATUSES: Enums["task_status"][] = ["todo", "in_progress", "in_review"];
export const ACTIVE_PROJECT_STATUSES: Enums["project_status"][] = ["planning", "in_progress", "testing"];

export const AGENT_STATUS: Record<Enums["agent_status"], StatusMeta & { pulse: boolean }> = {
  working: { label: "Working", tone: "accent", pulse: true },
  waiting: { label: "Waiting", tone: "warning", pulse: false },
  completed: { label: "Completed", tone: "good", pulse: false },
  error: { label: "Error", tone: "critical", pulse: false },
  offline: { label: "Offline", tone: "neutral", pulse: false },
};

export const ACTIVE_AGENT_STATUSES: Enums["agent_status"][] = ["working", "waiting"];

export const GAME_STATUS: Record<Enums["game_status"], StatusMeta> = {
  in_development: { label: "In development", tone: "info" },
  testing: { label: "Testing", tone: "warning" },
  live: { label: "Live", tone: "good" },
  paused: { label: "Paused", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
};

export const PROJECT_STATUS: Record<Enums["project_status"], StatusMeta> = {
  planning: { label: "Planning", tone: "neutral" },
  in_progress: { label: "In progress", tone: "accent" },
  testing: { label: "Testing", tone: "warning" },
  completed: { label: "Completed", tone: "good" },
  on_hold: { label: "On hold", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "critical" },
};

/** Options for <Select> built from a status map, in declaration order. */
export function statusOptions<K extends string>(map: Record<K, StatusMeta>): { value: K; label: string }[] {
  return (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }));
}
