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
        toast.success(result.message ?? "Saved");
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
            Add member
          </Button>
        )
      }
      title={editing ? "Edit member" : "Add member"}
      description={
        editing
          ? "Job title, status and avatar shown on the team page."
          : "For people without an account (freelancers, contractors). They can be assigned projects and tasks. To give someone sign-in access, create an account in Settings → Members."
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field
          htmlFor="m-name"
          label="Name"
          required
          error={errors.displayName?.message}
          hint={member?.hasAccount ? "Synced from their profile when they change it." : undefined}
          className="sm:col-span-2"
        >
          <Input id="m-name" autoFocus aria-invalid={!!errors.displayName} aria-describedby={describedBy("m-name")} {...register("displayName")} />
        </Field>
        <Field htmlFor="m-title" label="Job title" error={errors.studioRole?.message} hint="e.g. Builder, Scripter, UI artist">
          <Input id="m-title" aria-invalid={!!errors.studioRole} {...register("studioRole")} />
        </Field>
        <Field htmlFor="m-status" label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                id="m-status"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            )}
          />
        </Field>
        <Field htmlFor="m-joined" label="Joined" required error={errors.joinedAt?.message}>
          <Input id="m-joined" type="date" aria-invalid={!!errors.joinedAt} {...register("joinedAt")} />
        </Field>
        <Field htmlFor="m-avatar" label="Avatar" error={errors.avatarUrl?.message} hint="Optional https:// image link.">
          <Input id="m-avatar" type="url" placeholder="https://…" aria-invalid={!!errors.avatarUrl} {...register("avatarUrl")} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditMemberButton(props: Required<Pick<MemberFormModalProps, "member">>) {
  return (
    <MemberFormModal
      {...props}
      trigger={
        <Button variant="secondary">
          <Pencil aria-hidden />
          Edit
        </Button>
      }
    />
  );
}

export function DeleteMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      title="Delete this member?"
      description={`${name} will be removed from the team. Their tasks become unassigned and they leave their projects.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMember(memberId);
                if (result.ok) {
                  toast.success(result.message ?? "Member deleted");
                  setOpen(false);
                  router.push("/team");
                } else toast.error(result.message ?? "The member couldn't be deleted.");
              })
            }
          >
            Delete member
          </Button>
        </>
      }
    />
  );
}
