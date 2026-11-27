"use client";

import { Ellipsis, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/states";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { statusOptions, TASK_PRIORITY, TASK_STATUS } from "@/features/shared/status";
import { useFormat, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";
import type { Formatters } from "@/lib/utils/format";
import { deleteTask, setTaskStatus } from "./actions";
import type { TaskInput } from "./schemas";
import { TaskFormModal, type TaskFormOptions } from "./task-form";

/** Serializable task shape the table needs (mirrors data.ts TaskItem). */
export type TaskRowData = {
  id: string;
  title: string;
  description: string | null;
  priority: keyof typeof TASK_PRIORITY;
  status: keyof typeof TASK_STATUS;
  dueDate: string | null;
  createdBy: string | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
};

type Permissions = { canEdit: boolean; canDeleteAny: boolean; userId: string };

function StatusCell({ task, canEdit }: { task: TaskRowData; canEdit: boolean }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const meta = TASK_STATUS[task.status];
  if (!canEdit) return <Badge tone={meta.tone}>{t.common.status.task[task.status]}</Badge>;
  return (
    <Select
      aria-label={t.tasks.table.statusOf(task.title)}
      value={task.status}
      disabled={pending}
      className="h-7 w-32 text-xs"
      options={statusOptions(TASK_STATUS, t.common.status.task)}
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await setTaskStatus(task.id, next);
          if (!result.ok) toast.error(result.message ?? t.tasks.actions.statusFailed);
        })
      }
    />
  );
}

function dueCell(task: TaskRowData, today: string, t: Messages, f: Formatters) {
  if (!task.dueDate) return <span className="text-fg-3">—</span>;
  const overdue = task.dueDate < today && task.status !== "done" && task.status !== "cancelled";
  return (
    <span className={cn("tabular", overdue ? "font-medium text-critical" : "text-fg-2")} title={overdue ? t.tasks.table.overdue : undefined}>
      {f.formatShortDate(task.dueDate)}
      {overdue ? <span className="sr-only">{t.tasks.table.overdueSr}</span> : null}
    </span>
  );
}

function toInput(task: TaskRowData): TaskInput {
  return {
    title: task.title,
    description: task.description ?? "",
    projectId: task.project?.id ?? "",
    assigneeId: task.assignee?.id ?? "",
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ?? "",
  };
}

type TaskTableProps = {
  tasks: TaskRowData[];
  today: string;
  permissions: Permissions;
  options: TaskFormOptions;
  /** Prefill for "New task" (e.g. the project being viewed). */
  newTaskDefaults?: Partial<TaskInput>;
  /** Hide the project column (inside a project page). */
  hideProject?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function TaskTable({
  tasks,
  today,
  permissions,
  options,
  newTaskDefaults,
  hideProject,
  emptyTitle,
  emptyDescription,
}: TaskTableProps) {
  const t = useT();
  const f = useFormat();
  const c = t.tasks.table;
  const [editing, setEditing] = useState<TaskRowData | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  // Stable identity: the dialog only resets its fields when the edited task changes.
  const editingTask = useMemo(() => (editing ? { id: editing.id, values: toInput(editing) } : undefined), [editing]);

  function remove(task: TaskRowData) {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) toast.success(result.message ?? t.tasks.actions.deleted);
      else toast.error(result.message ?? t.tasks.actions.deleteFailed);
    });
  }

  const columns: Column<TaskRowData>[] = [
    {
      id: "title",
      header: c.task,
      sortValue: (task) => task.title.toLowerCase(),
      cell: (task) => (
        <div className="min-w-0 max-w-md">
          <p className={cn("truncate font-medium", task.status === "done" ? "text-fg-3 line-through" : "text-fg")}>{task.title}</p>
          {!hideProject && task.project ? (
            <Link href={`/projects/${task.project.id}`} className="truncate text-xs text-fg-3 hover:text-accent">
              {task.project.name}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      id: "assignee",
      header: c.assignee,
      sortValue: (task) => task.assignee?.name ?? "~",
      cell: (task) =>
        task.assignee ? (
          <span className="flex items-center gap-2">
            <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="xs" />
            <span className="truncate">{task.assignee.name}</span>
          </span>
        ) : (
          <span className="text-fg-3">{c.unassigned}</span>
        ),
    },
    {
      id: "priority",
      header: c.priority,
      sortValue: (task) => TASK_PRIORITY[task.priority].rank,
      cell: (task) => (
        <Badge tone={TASK_PRIORITY[task.priority].tone} dot>
          {t.common.status.priority[task.priority]}
        </Badge>
      ),
    },
    { id: "status", header: c.status, sortValue: (task) => task.status, cell: (task) => <StatusCell task={task} canEdit={permissions.canEdit} /> },
    { id: "due", header: c.due, sortValue: (task) => task.dueDate, cell: (task) => dueCell(task, today, t, f) },
  ];

  if (permissions.canEdit) {
    columns.push({
      id: "actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (task) => {
        const canDelete = permissions.canDeleteAny || task.createdBy === permissions.userId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={c.actionsFor(task.title)}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditing(task)}>
                <Pencil aria-hidden />
                {t.common.actions.edit}
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => remove(task)}>
                    <Trash2 aria-hidden />
                    {t.common.actions.delete}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return (
    <>
      {permissions.canEdit ? (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {c.newTask}
          </Button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <DataTable
          columns={columns}
          rows={tasks}
          getRowId={(task) => task.id}
          caption={c.caption}
          pageSize={20}
          empty={<EmptyState icon={ListTodo} title={emptyTitle ?? c.emptyTitle} description={emptyDescription ?? c.emptyDescription} />}
        />
      </div>
      <TaskFormModal open={creating} onOpenChange={setCreating} options={options} defaults={newTaskDefaults} />
      <TaskFormModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        options={options}
        task={editingTask}
      />
    </>
  );
}
