"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessage, useT } from "@/i18n/client";
import { signIn } from "./actions";
import { AuthHeading, FormMessage, PasswordInput } from "./form-parts";
import { initialFormState } from "./schemas";

function LoginFormInner({ next, linkError }: { next?: string; linkError?: string }) {
  const t = useT();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(signIn, initialFormState);
  // Controlled: React resets uncontrolled fields after each form action, which
  // would wipe the email after a wrong password. The password is cleared on purpose.
  const [email, setEmail] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <AuthHeading title={t.auth.login.title} description={t.auth.login.description} />
      <form action={formAction} noValidate className="space-y-4">
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        {linkError && state.status === "idle" ? <FormMessage tone="error">{linkError}</FormMessage> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field htmlFor="email" label={t.auth.login.email} error={msg(errors.email)}>
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

        <Field htmlFor="password" label={t.auth.login.password} error={msg(errors.password)}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required invalid={!!errors.password} />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-fg-3 transition-colors hover:text-accent-ink">
            {t.auth.login.forgot}
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
          {pending ? t.auth.login.submitting : t.auth.login.submit}
        </Button>
      </form>
    </>
  );
}

/** Reads ?next= and ?error= from the URL (requires a Suspense boundary). */
export function LoginForm() {
  const t = useT();
  const params = useSearchParams();
  const errorKey = params.get("error");
  const linkErrors: Record<string, string> = { link_invalid: t.auth.login.linkInvalid };
  return <LoginFormInner next={params.get("next") ?? undefined} linkError={errorKey ? linkErrors[errorKey] : undefined} />;
}

/** Prerender fallback: same form, without URL-dependent values. */
export function LoginFormFallback() {
  return <LoginFormInner />;
}
