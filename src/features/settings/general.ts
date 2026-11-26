import { z } from "zod";

/** Studio-wide settings (Settings → General). Shared by form and Server Action. */
export const generalSettingsSchema = z.object({
  studioName: z.string().trim().min(1, "Enter the studio name.").max(80, "80 characters maximum."),
  // Text so the field edits freely; e.g. "0.0038" USD per Robux.
  devexRate: z
    .string()
    .trim()
    .regex(/^0?\.\d{1,6}$|^[01](\.\d{1,6})?$/, "Enter a rate like 0.0038 (USD per Robux).")
    .refine((v) => Number(v) > 0 && Number(v) <= 1, "The rate must be above 0 and at most 1."),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

/** In-app notifications a user can turn off (keys of profiles.notification_prefs). */
export const NOTIFICATION_PREFS = [
  { key: "task_assigned", label: "Task assigned to me", description: "When someone else assigns you a task." },
  { key: "project_added", label: "Added to a project", description: "When someone else adds you to a project." },
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREFS)[number]["key"];
