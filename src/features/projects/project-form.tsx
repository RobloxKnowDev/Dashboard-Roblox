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
        toast.success(result.message ?? "Saved");
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
            New project
          </Button>
        )
      }
      title={editing ? "Edit project" : "New project"}
      description="Projects group tasks, members and a target release date."
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="p-name" label="Name" required error={errors.name?.message} className="sm:col-span-2">
          <Input id="p-name" autoFocus aria-invalid={!!errors.name} aria-describedby={describedBy("p-name")} {...register("name")} />
        </Field>

        <Field htmlFor="p-description" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea id="p-description" rows={3} aria-invalid={!!errors.description} {...register("description")} />
        </Field>

        <Field htmlFor="p-status" label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select id="p-status" value={field.value} onValueChange={field.onChange} options={statusOptions(PROJECT_STATUS)} />
            )}
          />
        </Field>

        <Field htmlFor="p-progress" label={`Progress — ${progress}%`} error={errors.progress?.message}>
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

        <Field htmlFor="p-date" label="Target release date" error={errors.targetReleaseDate?.message}>
          <Input id="p-date" type="date" aria-invalid={!!errors.targetReleaseDate} {...register("targetReleaseDate")} />
        </Field>

        <Field htmlFor="p-game" label="Linked game">
          <Controller
            control={control}
            name="gameId"
            render={({ field }) => (
              <Select
                id="p-game"
                value={field.value || NO_GAME}
                onValueChange={(v) => field.onChange(v === NO_GAME ? "" : v)}
                options={[{ value: NO_GAME, label: "No linked game" }, ...options.games.map((g) => ({ value: g.id, label: g.name }))]}
              />
            )}
          />
        </Field>

        <Field
          htmlFor="p-image"
          label="Image"
          error={errors.coverImageUrl?.message}
          hint="Optional https:// link. Without one, the linked game's icon is used."
          className="sm:col-span-2"
        >
          <Input id="p-image" type="url" placeholder="https://…" aria-invalid={!!errors.coverImageUrl} {...register("coverImageUrl")} />
        </Field>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-fg-2">Members</legend>
          {options.members.length === 0 ? (
            <p className="text-xs text-fg-3">No team members yet.</p>
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
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditProjectButton(props: Omit<ProjectFormModalProps, "trigger">) {
  return (
    <ProjectFormModal
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

/** Delete with confirmation (administrators). */
export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
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
      title="Delete this project?"
      description={`${name} and all of its tasks will be permanently deleted.`}
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
                const result = await deleteProject(projectId);
                if (result.ok) {
                  toast.success(result.message ?? "Project deleted");
                  setOpen(false);
                  router.push("/projects");
                } else toast.error(result.message ?? "The project couldn't be deleted.");
              })
            }
          >
            Delete project
          </Button>
        </>
      }
    />
  );
}
