import { z } from "zod";
import { newPasswordSchema } from "@/features/auth/schemas";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "At least 2 characters.").max(120, "120 characters maximum."),
  avatarUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Use an https:// image link." })]),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
