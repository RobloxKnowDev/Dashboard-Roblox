import { z } from "zod";
import { Constants } from "@/types/database";

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Give the task a title (2 characters minimum).").max(200, "200 characters maximum."),
  description: z.string().trim().max(4000, "4,000 characters maximum."),
  projectId: z.union([z.literal(""), z.uuid()]),
  assigneeId: z.union([z.literal(""), z.uuid()]),
  priority: z.enum(Constants.public.Enums.task_priority),
  status: z.enum(Constants.public.Enums.task_status),
  dueDate: z.union([z.literal(""), z.iso.date("Pick a valid date.")]),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const emptyTask: TaskInput = {
  title: "",
  description: "",
  projectId: "",
  assigneeId: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
};

export const TASK_VIEWS = [
  { value: "all", label: "All tasks" },
  { value: "mine", label: "My tasks" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

export type TaskView = (typeof TASK_VIEWS)[number]["value"];

export function parseTaskView(value: unknown): TaskView {
  return TASK_VIEWS.find((v) => v.value === value)?.value ?? "all";
}
