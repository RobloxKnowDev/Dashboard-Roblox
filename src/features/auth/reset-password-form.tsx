"use client";

import { Check, Circle } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useMessage, useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { updatePassword } from "./actions";
import { AuthHeading, FormMessage, PasswordInput } from "./form-parts";
import { initialFormState } from "./schemas";

const RULES = [
  { key: "length", test: (v: string) => v.length >= 10 },
  { key: "lowercase", test: (v: string) => /[a-z]/.test(v) },
  { key: "uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { key: "digit", test: (v: string) => /[0-9]/.test(v) },
] as const;

export function ResetPasswordForm() {
  const t = useT();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(updatePassword, initialFormState);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <AuthHeading title={t.auth.reset.title} description={t.auth.reset.description} />
      <form action={formAction} noValidate className="space-y-4">
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}

        <Field htmlFor="password" label={t.auth.reset.newPassword} error={msg(errors.password)}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!errors.password}
          />
        </Field>

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label={t.auth.reset.requirements}>
          {RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.key} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-good" : "text-fg-3")}>
                {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                {t.auth.reset.rules[rule.key]}
                <span className="sr-only">{ok ? t.auth.reset.met : t.auth.reset.notMet}</span>
              </li>
            );
          })}
        </ul>

        <Field htmlFor="confirm" label={t.auth.reset.confirm} error={msg(errors.confirm)}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required invalid={!!errors.confirm} />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
          {pending ? t.auth.reset.submitting : t.auth.reset.submit}
        </Button>
      </form>
    </>
  );
}
