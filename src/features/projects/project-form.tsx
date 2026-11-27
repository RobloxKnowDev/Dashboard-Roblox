"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS, statusOptions } from "@/features/shared/status";
import { useMessage, useT } from "@/i18n/client";
import { deleteProject, saveProject } from "./actions";
import { emptyProject, projectSchema, type ProjectInput } from "./schemas";

export type ProjectFormOptions = {
  members: { id: string; name: string; avatarUrl: string | null }[];
  games: { id: string; name: string }[];
};

const NO_GAME = "none";

type ProjectFormModalProps = {
  options: ProjectFormOptions;
  /** Present when editing. */
  project?: { id: string; values: ProjectInput };
  trigger?: ReactNode;
};

export function ProjectFormModal({ options, project, trigger }: ProjectFormModalProps) {
  const t = useT();
  const msg = useMessage();
  const c = t.projects.form;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = !!project;
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: project?.values ?? emptyProject,
  });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveProject(values, project?.id);
      if (result.ok) {
        toast.success(result.message ?? c.saved);
        setOpen(false);
        if (!editing) reset(emptyProject);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof ProjectInput, { message });
      }
      if (result.message) toast.error(result.message);
    }),
  );

  const progress = useWatch({ control, name: "progress" });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(project?.values ?? emptyProject);
      }}
      size="lg"
      trigger={
        trigger ?? (
          <Button variant="primary">
            <Plus aria-hidden />
            {c.newProject}
          </Button>
        )
      }
      title={editing ? c.editProject : c.newProject}
      description={c.intro}
    >
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field htmlFor="p-name" label={c.name} required error={msg(errors.name?.message)} className="sm:col-span-2">
          <Input id="p-name" autoFocus aria-invalid={!!errors.name} aria-describedby={describedBy("p-name")} {...register("name")} />
        </Field>

        <Field htmlFor="p-description" label={c.description} error={msg(errors.description?.message)} className="sm:col-span-2">
          <Textarea id="p-description" rows={3} aria-invalid={!!errors.description} {...register("description")} />
        </Field>

        <Field htmlFor="p-status" label={c.status}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select id="p-status" value={field.value} onValueChange={field.onChange} options={statusOptions(PROJECT_STATUS, t.common.status.project)} />
            )}
          />
        </Field>

        <Field htmlFor="p-progress" label={c.progress(progress)} error={msg(errors.progress?.message)}>
          <input
            id="p-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            className="h-8 w-full accent-[var(--color-accent)]"
            {...register("progress", { valueAsNumber: true })}
          />
        </Field>

        <Field htmlFor="p-date" label={c.targetDate} error={msg(errors.targetReleaseDate?.message)}>
          <Input id="p-date" type="date" aria-invalid={!!errors.targetReleaseDate} {...register("targetReleaseDate")} />
        </Field>

        <Field htmlFor="p-game" label={c.linkedGame}>
          <Controller
            control={control}
            name="gameId"
            render={({ field }) => (
              <Select
                id="p-game"
                value={field.value || NO_GAME}
                onValueChange={(v) => field.onChange(v === NO_GAME ? "" : v)}
                options={[{ value: NO_GAME, label: c.noLinkedGame }, ...options.games.map((g) => ({ value: g.id, label: g.name }))]}
              />
            )}
          />
        </Field>

        <Field
          htmlFor="p-image"
          label={c.image}
          error={msg(errors.coverImageUrl?.message)}
          hint={c.imageHint}
          className="sm:col-span-2"
        >
          <Input id="p-image" type="url" placeholder="https://…" aria-invalid={!!errors.coverImageUrl} {...register("coverImageUrl")} />
        </Field>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-fg-2">{c.members}</legend>
          {options.members.length === 0 ? (
            <p className="text-xs text-fg-3">{c.noTeamMembers}</p>
          ) : (
            <Controller
              control={control}
              name="memberIds"
              render={({ field }) => (
                <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border border-line bg-surface p-1.5 sm:grid-cols-2">
                  {options.members.map((member) => {
                    const checked = field.value.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[13px] text-fg-2 hover:bg-surface-2"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-accent)]"
                          checked={checked}
                          onChange={(e) =>
                            field.onChange(e.target.checked ? [...field.value, member.id] : field.value.filter((id) => id !== member.id))
                          }
                        />
                        <Avatar name={member.name} src={member.avatarUrl} size="xs" />
                        <span className="truncate">{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? t.common.actions.saveChanges : c.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditProjectButton(props: Omit<ProjectFormModalProps, "trigger">) {
  const t = useT();
  return (
    <ProjectFormModal
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

/** Delete with confirmation (administrators). */
export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const t = useT();
  const c = t.projects.delete;
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
                const result = await deleteProject(projectId);
                if (result.ok) {
                  toast.success(result.message ?? t.projects.actions.deleted);
                  setOpen(false);
                  router.push("/projects");
                } else toast.error(result.message ?? t.projects.actions.deleteFailed);
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
