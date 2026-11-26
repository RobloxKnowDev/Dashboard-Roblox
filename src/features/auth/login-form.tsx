"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "./actions";
import { AuthHeading, FormMessage, PasswordInput } from "./form-parts";
import { initialFormState } from "./schemas";

const LINK_ERRORS: Record<string, string> = {
  link_invalid: "This link is invalid or has expired. Ask for a new one.",
};

function LoginFormInner({ next, linkError }: { next?: string; linkError?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialFormState);
  // Controlled: React resets uncontrolled fields after each form action, which
  // would wipe the email after a wrong password. The password is cleared on purpose.
  const [email, setEmail] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <AuthHeading title="Sign in" description="Welcome back. Sign in to your studio workspace." />
      <form action={formAction} noValidate className="space-y-4">
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        {linkError && state.status === "idle" ? <FormMessage tone="error">{linkError}</FormMessage> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field htmlFor="email" label="Email" error={errors.email}>
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

        <Field htmlFor="password" label="Password" error={errors.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required invalid={!!errors.password} />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-fg-3 transition-colors hover:text-accent">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}

/** Reads ?next= and ?error= from the URL (requires a Suspense boundary). */
export function LoginForm() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  return <LoginFormInner next={params.get("next") ?? undefined} linkError={errorKey ? LINK_ERRORS[errorKey] : undefined} />;
}

/** Prerender fallback: same form, without URL-dependent values. */
export function LoginFormFallback() {
  return <LoginFormInner />;
}
