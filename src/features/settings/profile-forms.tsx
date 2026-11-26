"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import { PasswordInput } from "@/features/auth/form-parts";
import { changePassword, updateProfile } from "./profile-actions";
import { passwordChangeSchema, profileSchema, type PasswordChangeInput, type ProfileInput } from "./profile";

function applyResult<T extends FieldValues>(result: ActionResult, setError: UseFormSetError<T>) {
  if (result.ok) {
    toast.success(result.message ?? "Saved");
    return true;
  }
  for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as Path<T>, { message });
  if (result.message) toast.error(result.message);
  return false;
}

export function ProfileForm({ defaults }: { defaults: ProfileInput }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const errors = formState.errors;

  return (
    <Card className="p-5">
      <h3 className="text-[13px] font-semibold text-fg">Public profile</h3>
      <p className="mt-0.5 text-xs text-fg-3">Shown to the team on projects, tasks and activity.</p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={handleSubmit((values) => startTransition(async () => void applyResult(await updateProfile(values), setError)))}
      >
        <Field htmlFor="fullName" label="Display name" required error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={describedBy("fullName")} {...register("fullName")} />
        </Field>
        <Field htmlFor="avatarUrl" label="Avatar image" hint="Optional https:// link to a square image." error={errors.avatarUrl?.message}>
          <Input id="avatarUrl" type="url" placeholder="https://…" aria-invalid={!!errors.avatarUrl} {...register("avatarUrl")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const errors = formState.errors;

  return (
    <Card className="p-5">
      <h3 className="text-[13px] font-semibold text-fg">Password</h3>
      <p className="mt-0.5 text-xs text-fg-3">At least 10 characters, with lowercase, uppercase and a digit.</p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            if (applyResult(await changePassword(values), setError)) reset();
          }),
        )}
      >
        <Field htmlFor="password" label="New password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field htmlFor="confirm" label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
