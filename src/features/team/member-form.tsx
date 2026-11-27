"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useMessage, useT } from "@/i18n/client";
import { deleteMember, saveMember } from "./actions";
import { emptyMember, memberSchema, type MemberInput } from "./schemas";

/** Local calendar day — called from event handlers only (never during render). */
const localToday = () => new Date().toLocaleDateString("en-CA");

type MemberFormModalProps = {
  /** Present when editing. */
  member?: { id: string; values: MemberInput; hasAccount: boolean };
  trigger?: ReactNode;
};

export function MemberFormModal({ member, trigger }: MemberFormModalProps) {
  const t = useT();
  const msg = useMessage();
  const c = t.team.form;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editing = !!member;
  const form = useForm<MemberInput>({ resolver: zodResolver(memberSchema), defaultValues: member?.values ?? emptyMember });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveMember(values, member?.id);
      if (result.ok) {
        toast.success(result.message ?? c.saved);
        setOpen(false);
        if (!editing && result.data) router.push(`/team/${result.data.id}`);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof MemberInput, { message });
      if (result.message) toast.error(result.message);
    }),
  );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(member?.values ?? { ...emptyMember, joinedAt: localToday() });
      }}
      trigger={
        trigger ?? (
          <Button variant="primary">
            <UserPlus aria-hidden />
            {c.add}
          </Button>
        )
      }
      title={editing ? c.edit : c.add}
      description={editing ? c.editIntro : c.addIntro}
    >
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          htmlFor="m-name"
          label={c.name}
          required
          error={msg(errors.displayName?.message)}
          hint={member?.hasAccount ? c.nameSynced : undefined}
          className="sm:col-span-2"
        >
          <Input id="m-name" autoFocus aria-invalid={!!errors.displayName} aria-describedby={describedBy("m-name")} {...register("displayName")} />
        </Field>
        <Field htmlFor="m-title" label={c.jobTitle} error={msg(errors.studioRole?.message)} hint={c.jobTitleHint}>
          <Input id="m-title" aria-invalid={!!errors.studioRole} {...register("studioRole")} />
        </Field>
        <Field htmlFor="m-status" label={c.status}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                id="m-status"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: "active", label: c.statuses.active },
                  { value: "inactive", label: c.statuses.inactive },
                ]}
              />
            )}
          />
        </Field>
        <Field htmlFor="m-joined" label={c.joined} required error={msg(errors.joinedAt?.message)}>
          <Input id="m-joined" type="date" aria-invalid={!!errors.joinedAt} {...register("joinedAt")} />
        </Field>
        <Field htmlFor="m-avatar" label={c.avatar} error={msg(errors.avatarUrl?.message)} hint={c.avatarHint}>
          <Input id="m-avatar" type="url" placeholder="https://…" aria-invalid={!!errors.avatarUrl} {...register("avatarUrl")} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? t.common.actions.saveChanges : c.add}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditMemberButton(props: Required<Pick<MemberFormModalProps, "member">>) {
  const t = useT();
  return (
    <MemberFormModal
      {...props}
      trigger={
        <Button variant="secondary">
          <Pencil aria-hidden />
          {t.common.actions.edit}
        </Button>
      }
    />
  );
}

export function DeleteMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const t = useT();
  const c = t.team.delete;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={c.label(name)}>
          <Trash2 />
        </Button>
      }
      title={c.title}
      description={c.description(name)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMember(memberId);
                if (result.ok) {
                  toast.success(result.message ?? t.team.actions.deleted);
                  setOpen(false);
                  router.push("/team");
                } else toast.error(result.message ?? t.team.actions.deleteFailed);
              })
            }
          >
            {c.confirm}
          </Button>
        </>
      }
    />
  );
}
