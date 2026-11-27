"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { statusOptions, TASK_PRIORITY, TASK_STATUS } from "@/features/shared/status";
import { useMessage, useT } from "@/i18n/client";
import { saveTask } from "./actions";
import { emptyTask, taskSchema, type TaskInput } from "./schemas";

export type TaskFormOptions = {
  projects: { id: string; name: string }[];
  members: { id: string; name: string; avatarUrl: string | null }[];
};

const NONE = "none";

type TaskFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TaskFormOptions;
  /** Present when editing. */
  task?: { id: string; values: TaskInput };
  /** Prefill for new tasks (e.g. the current project). */
  defaults?: Partial<TaskInput>;
};

/** Controlled create/edit dialog — one instance serves a whole list. */
export function TaskFormModal({ open, onOpenChange, options, task, defaults }: TaskFormModalProps) {
  const t = useT();
  const msg = useMessage();
  const c = t.tasks.form;
  const [pending, startTransition] = useTransition();
  const form = useForm<TaskInput>({ resolver: zodResolver(taskSchema), defaultValues: emptyTask });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  // Load the right values each time the dialog opens.
  useEffect(() => {
    if (open) reset(task?.values ?? { ...emptyTask, ...defaults });
  }, [open, task, defaults, reset]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveTask(values, task?.id);
      if (result.ok) {
        toast.success(result.message ?? c.saved);
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof TaskInput, { message });
      }
      if (result.message) toast.error(result.message);
    }),
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title={task ? c.editTask : c.newTask} description={c.intro}>
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field htmlFor="t-title" label={c.title} required error={msg(errors.title?.message)} className="sm:col-span-2">
          <Input id="t-title" autoFocus aria-invalid={!!errors.title} aria-describedby={describedBy("t-title")} {...register("title")} />
        </Field>
        <Field htmlFor="t-description" label={c.description} error={msg(errors.description?.message)} className="sm:col-span-2">
          <Textarea id="t-description" rows={3} {...register("description")} />
        </Field>
        <Field htmlFor="t-project" label={c.project}>
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Select
                id="t-project"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: c.noProject }, ...options.projects.map((p) => ({ value: p.id, label: p.name }))]}
              />
            )}
          />
        </Field>
        <Field htmlFor="t-assignee" label={c.assignee}>
          <Controller
            control={control}
            name="assigneeId"
            render={({ field }) => (
              <Select
                id="t-assignee"
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                options={[{ value: NONE, label: c.unassigned }, ...options.members.map((m) => ({ value: m.id, label: m.name }))]}
              />
            )}
          />
        </Field>
        <Field htmlFor="t-priority" label={c.priority}>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select id="t-priority" value={field.value} onValueChange={field.onChange} options={statusOptions(TASK_PRIORITY, t.common.status.priority)} />
            )}
          />
        </Field>
        <Field htmlFor="t-status" label={c.status}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select id="t-status" value={field.value} onValueChange={field.onChange} options={statusOptions(TASK_STATUS, t.common.status.task)} />
            )}
          />
        </Field>
        <Field htmlFor="t-due" label={c.dueDate} error={msg(errors.dueDate?.message)}>
          <Input id="t-due" type="date" aria-invalid={!!errors.dueDate} {...register("dueDate")} />
        </Field>
        <div className="flex items-end justify-end gap-2 sm:col-span-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.actions.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {task ? t.common.actions.saveChanges : c.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
