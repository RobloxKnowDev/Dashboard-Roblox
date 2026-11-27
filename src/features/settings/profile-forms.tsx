"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessage, useT } from "@/i18n/client";
import type { ActionResult } from "@/lib/action-result";
import { PasswordInput } from "@/features/auth/form-parts";
import { changePassword, updateProfile } from "./profile-actions";
import { passwordChangeSchema, profileSchema, type PasswordChangeInput, type ProfileInput } from "./profile";

function applyResult<T extends FieldValues>(result: ActionResult, setError: UseFormSetError<T>, savedFallback: string) {
  if (result.ok) {
    toast.success(result.message ?? savedFallback);
    return true;
  }
  for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as Path<T>, { message });
  if (result.message) toast.error(result.message);
  return false;
}

export function ProfileForm({ defaults }: { defaults: ProfileInput }) {
  const t = useT();
  const msg = useMessage();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const errors = formState.errors;

  return (
    <Card className="p-5">
      <h3 className="text-[13px] font-semibold text-fg">{t.settings.profile.publicTitle}</h3>
      <p className="mt-0.5 text-xs text-fg-3">{t.settings.profile.publicDescription}</p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => void applyResult(await updateProfile(values), setError, t.settings.toasts.saved)),
        )}
      >
        <Field htmlFor="fullName" label={t.settings.profile.displayName} required error={msg(errors.fullName?.message)}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={describedBy("fullName")} {...register("fullName")} />
        </Field>
        <Field htmlFor="avatarUrl" label={t.settings.profile.avatar} hint={t.settings.profile.avatarHint} error={msg(errors.avatarUrl?.message)}>
          <Input id="avatarUrl" type="url" placeholder="https://…" aria-invalid={!!errors.avatarUrl} {...register("avatarUrl")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            {t.settings.profile.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const t = useT();
  const msg = useMessage();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const errors = formState.errors;

  return (
    <Card className="p-5">
      <h3 className="text-[13px] font-semibold text-fg">{t.settings.profile.passwordTitle}</h3>
      <p className="mt-0.5 text-xs text-fg-3">{t.settings.profile.passwordDescription}</p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            if (applyResult(await changePassword(values), setError, t.settings.toasts.saved)) reset();
          }),
        )}
      >
        <Field htmlFor="password" label={t.settings.profile.newPassword} error={msg(errors.password?.message)}>
          <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field htmlFor="confirm" label={t.settings.profile.confirmPassword} error={msg(errors.confirm?.message)}>
          <PasswordInput id="confirm" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending}>
            {t.settings.profile.changePassword}
          </Button>
        </div>
      </form>
    </Card>
  );
}
