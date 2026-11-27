import type { BadgeTone } from "@/components/ui/badge";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/** Tone (and rank/pulse) of each value. Labels: t.common.status.<kind>[value]. */
type StatusMeta = { tone: BadgeTone };

/** Presentation of each enum value — one place, reused by every page. */
export const TASK_PRIORITY: Record<Enums["task_priority"], StatusMeta & { rank: number }> = {
  low: { tone: "neutral", rank: 0 },
  medium: { tone: "info", rank: 1 },
  high: { tone: "warning", rank: 2 },
  critical: { tone: "critical", rank: 3 },
};

export const TASK_STATUS: Record<Enums["task_status"], StatusMeta> = {
  todo: { tone: "neutral" },
  in_progress: { tone: "accent" },
  in_review: { tone: "info" },
  done: { tone: "good" },
  cancelled: { tone: "neutral" },
};

export const PENDING_TASK_STATUSES: Enums["task_status"][] = ["todo", "in_progress", "in_review"];
export const ACTIVE_PROJECT_STATUSES: Enums["project_status"][] = ["planning", "in_progress", "testing"];

export const AGENT_STATUS: Record<Enums["agent_status"], StatusMeta & { pulse: boolean }> = {
  working: { tone: "accent", pulse: true },
  waiting: { tone: "warning", pulse: false },
  completed: { tone: "good", pulse: false },
  error: { tone: "critical", pulse: false },
  offline: { tone: "neutral", pulse: false },
};

export const ACTIVE_AGENT_STATUSES: Enums["agent_status"][] = ["working", "waiting"];

export const GAME_STATUS: Record<Enums["game_status"], StatusMeta> = {
  in_development: { tone: "info" },
  testing: { tone: "warning" },
  live: { tone: "good" },
  paused: { tone: "neutral" },
  archived: { tone: "neutral" },
};

export const PROJECT_STATUS: Record<Enums["project_status"], StatusMeta> = {
  planning: { tone: "neutral" },
  in_progress: { tone: "accent" },
  testing: { tone: "warning" },
  completed: { tone: "good" },
  on_hold: { tone: "neutral" },
  cancelled: { tone: "critical" },
};

/** Options for <Select> built from a status map, in declaration order. */
/** Select options in the interface language: statusOptions(TASK_STATUS, t.common.status.task). */
export function statusOptions<K extends string>(map: Record<K, StatusMeta>, labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(map) as K[]).map((value) => ({ value, label: labels[value] }));
}
