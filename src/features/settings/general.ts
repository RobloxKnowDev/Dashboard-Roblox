import { z } from "zod";

/*
 * Studio-wide settings (Settings → General). Shared by form and Server Action.
 * Error messages are dictionary keys ("settings.validation.…"), translated by the form.
 */
export const generalSettingsSchema = z.object({
  studioName: z.string().trim().min(1, "settings.validation.studioNameRequired").max(80, "settings.validation.max80"),
  // Text so the field edits freely; e.g. "0.0038" USD per Robux.
  devexRate: z
    .string()
    .trim()
    .regex(/^0?\.\d{1,6}$|^[01](\.\d{1,6})?$/, "settings.validation.devexRateFormat")
    .refine((v) => Number(v) > 0 && Number(v) <= 1, "settings.validation.devexRateRange"),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

/**
 * In-app notifications a user can turn off (keys of profiles.notification_prefs).
 * Labels: t.settings.notifications.prefs[key].
 */
export const NOTIFICATION_PREFS = [{ key: "task_assigned" }, { key: "project_added" }] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREFS)[number]["key"];
