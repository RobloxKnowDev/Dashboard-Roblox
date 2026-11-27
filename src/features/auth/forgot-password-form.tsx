"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessage, useT } from "@/i18n/client";
import { requestPasswordReset } from "./actions";
import { AuthHeading, FormMessage } from "./form-parts";
import { initialFormState } from "./schemas";

export function ForgotPasswordForm() {
  const t = useT();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialFormState);
  // Controlled so a validation error doesn't wipe what was typed (React resets uncontrolled fields).
  const [email, setEmail] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <AuthHeading title={t.auth.forgot.title} description={t.auth.forgot.description} />
      {state.status === "success" ? (
        <div className="space-y-4">
          <FormMessage tone="success">{state.message}</FormMessage>
          <p className="text-xs leading-relaxed text-fg-3">{t.auth.forgot.afterSend}</p>
        </div>
      ) : (
        <form action={formAction} noValidate className="space-y-4">
          {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
          <Field htmlFor="email" label={t.auth.forgot.email} error={msg(errors.email)}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={describedBy("email")}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
            {pending ? t.auth.forgot.submitting : t.auth.forgot.submit}
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t.auth.forgot.backToSignIn}
      </Link>
    </>
  );
}
