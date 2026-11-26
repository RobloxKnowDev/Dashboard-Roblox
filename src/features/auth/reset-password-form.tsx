"use client";

import { Check, Circle } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { updatePassword } from "./actions";
import { AuthHeading, FormMessage, PasswordInput } from "./form-parts";
import { initialFormState } from "./schemas";

const RULES = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A digit", test: (v: string) => /[0-9]/.test(v) },
];

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialFormState);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <AuthHeading title="Choose a new password" description="You'll be signed in right after." />
      <form action={formAction} noValidate className="space-y-4">
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}

        <Field htmlFor="password" label="New password" error={errors.password}>
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

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Password requirements">
          {RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-good" : "text-fg-3")}>
                {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                {rule.label}
                <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
              </li>
            );
          })}
        </ul>

        <Field htmlFor="confirm" label="Confirm password" error={errors.confirm}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required invalid={!!errors.confirm} />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
      </form>
    </>
  );
}
