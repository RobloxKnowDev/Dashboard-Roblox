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
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/format";
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
  const [pending, startTransition] = useTransition();
  const meta = TASK_STATUS[task.status];
  if (!canEdit) return <Badge tone={meta.tone}>{meta.label}</Badge>;
  return (
    <Select
      aria-label={`Status of ${task.title}`}
      value={task.status}
      disabled={pending}
      className="h-7 w-32 text-xs"
      options={statusOptions(TASK_STATUS)}
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await setTaskStatus(task.id, next);
          if (!result.ok) toast.error(result.message ?? "The status couldn't be changed.");
        })
      }
    />
  );
}

function dueCell(task: TaskRowData, today: string) {
  if (!task.dueDate) return <span className="text-fg-3">—</span>;
  const overdue = task.dueDate < today && task.status !== "done" && task.status !== "cancelled";
  return (
    <span className={cn("tabular", overdue ? "font-medium text-critical" : "text-fg-2")} title={overdue ? "Overdue" : undefined}>
      {formatShortDate(task.dueDate)}
      {overdue ? <span className="sr-only"> (overdue)</span> : null}
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
  emptyTitle = "No tasks here",
  emptyDescription = "Tasks matching this view will show up here.",
}: TaskTableProps) {
  const [editing, setEditing] = useState<TaskRowData | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  // Stable identity: the dialog only resets its fields when the edited task changes.
  const editingTask = useMemo(() => (editing ? { id: editing.id, values: toInput(editing) } : undefined), [editing]);

  function remove(task: TaskRowData) {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) toast.success(result.message ?? "Task deleted");
      else toast.error(result.message ?? "The task couldn't be deleted.");
    });
  }

  const columns: Column<TaskRowData>[] = [
    {
      id: "title",
      header: "Task",
      sortValue: (t) => t.title.toLowerCase(),
      cell: (t) => (
        <div className="min-w-0 max-w-md">
          <p className={cn("truncate font-medium", t.status === "done" ? "text-fg-3 line-through" : "text-fg")}>{t.title}</p>
          {!hideProject && t.project ? (
            <Link href={`/projects/${t.project.id}`} className="truncate text-xs text-fg-3 hover:text-accent">
              {t.project.name}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      sortValue: (t) => t.assignee?.name ?? "~",
      cell: (t) =>
        t.assignee ? (
          <span className="flex items-center gap-2">
            <Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size="xs" />
            <span className="truncate">{t.assignee.name}</span>
          </span>
        ) : (
          <span className="text-fg-3">Unassigned</span>
        ),
    },
    {
      id: "priority",
      header: "Priority",
      sortValue: (t) => TASK_PRIORITY[t.priority].rank,
      cell: (t) => (
        <Badge tone={TASK_PRIORITY[t.priority].tone} dot>
          {TASK_PRIORITY[t.priority].label}
        </Badge>
      ),
    },
    { id: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <StatusCell task={t} canEdit={permissions.canEdit} /> },
    { id: "due", header: "Due", sortValue: (t) => t.dueDate, cell: (t) => dueCell(t, today) },
  ];

  if (permissions.canEdit) {
    columns.push({
      id: "actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (t) => {
        const canDelete = permissions.canDeleteAny || t.createdBy === permissions.userId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.title}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditing(t)}>
                <Pencil aria-hidden />
                Edit
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => remove(t)}>
                    <Trash2 aria-hidden />
                    Delete
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
            New task
          </Button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <DataTable
          columns={columns}
          rows={tasks}
          getRowId={(t) => t.id}
          caption="Tasks"
          pageSize={20}
          empty={<EmptyState icon={ListTodo} title={emptyTitle} description={emptyDescription} />}
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
