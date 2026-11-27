import { z } from "zod";

/* Error messages are dictionary keys ("auth.validation.…"): forms translate them with useMessage(). */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "auth.validation.emailRequired")
  .max(254, "auth.validation.emailTooLong")
  .pipe(z.email("auth.validation.emailInvalid"));

/** Mirrors the password policy configured on Supabase Auth. */
export const newPasswordSchema = z
  .string()
  .min(10, "auth.validation.passwordMin")
  .max(72, "auth.validation.passwordMax")
  .regex(/[a-z]/, "auth.validation.passwordLowercase")
  .regex(/[A-Z]/, "auth.validation.passwordUppercase")
  .regex(/[0-9]/, "auth.validation.passwordDigit");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "auth.validation.passwordRequired").max(72, "auth.validation.passwordMax"),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "auth.validation.passwordsMismatch",
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Shape returned by every auth Server Action to its form. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

export const initialFormState: FormState = { status: "idle" };

export function fieldErrorsOf(error: z.ZodError): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
