import { z } from "zod";
import { Constants } from "@/types/database";

/** Error messages are dictionary keys, translated on screen with useMessage(). */
export const taskSchema = z.object({
  title: z.string().trim().min(2, "tasks.validation.titleRequired").max(200, "tasks.validation.titleMax"),
  description: z.string().trim().max(4000, "tasks.validation.descriptionMax"),
  projectId: z.union([z.literal(""), z.uuid()]),
  assigneeId: z.union([z.literal(""), z.uuid()]),
  priority: z.enum(Constants.public.Enums.task_priority),
  status: z.enum(Constants.public.Enums.task_status),
  dueDate: z.union([z.literal(""), z.iso.date("tasks.validation.dateInvalid")]),
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

/** Task list views. Labels: t.tasks.views[value]. */
export const TASK_VIEWS = ["all", "mine", "in_progress", "completed"] as const;

export type TaskView = (typeof TASK_VIEWS)[number];

export function parseTaskView(value: unknown): TaskView {
  return TASK_VIEWS.find((v) => v === value) ?? "all";
}
