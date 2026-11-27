import { z } from "zod";
import { newPasswordSchema } from "@/features/auth/schemas";

/* Error messages are dictionary keys, translated by the forms (useMessage). */

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "settings.validation.nameMin2").max(120, "settings.validation.max120"),
  avatarUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "settings.validation.avatarHttps" })]),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "auth.validation.passwordsMismatch" });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
