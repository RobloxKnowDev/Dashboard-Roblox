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
