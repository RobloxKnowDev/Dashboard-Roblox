import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { filterTasks, getTaskFormOptions, listTasks } from "@/features/tasks/data";
import { parseTaskView } from "@/features/tasks/schemas";
import { TaskTable } from "@/features/tasks/task-table";
import { TasksToolbar, TasksToolbarFallback } from "@/features/tasks/tasks-toolbar";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tasks" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

async function Toolbar() {
  const options = await getTaskFormOptions();
  return <TasksToolbar projects={options.projects} />;
}

const EMPTY = {
  all: ["No tasks yet", "Create the first task to start tracking the studio's work."],
  mine: ["Nothing assigned to you", "Tasks assigned to you will show up here."],
  in_progress: ["Nothing in progress", "Tasks in progress or in review show up here."],
  completed: ["No completed tasks", "Finished tasks show up here."],
} as const;

async function TasksSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [user, tasks, options] = await Promise.all([requireUser(), listTasks(), getTaskFormOptions()]);
  if (tasks === null) return <ErrorState description="Tasks couldn't be loaded. Refresh the page to try again." />;

  const view = parseTaskView(one(params.view));
  const filtered = filterTasks(
    tasks,
    { view, priority: one(params.priority), projectId: one(params.project), q: one(params.q) },
    user.id,
  );
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const role = user.role ?? "viewer";
  const [emptyTitle, emptyDescription] = EMPTY[view];

  return (
    <TaskTable
      tasks={filtered}
      today={today}
      options={options}
      permissions={{ canEdit: hasMinRole(role, "developer"), canDeleteAny: hasMinRole(role, "admin"), userId: user.id }}
      newTaskDefaults={one(params.project) ? { projectId: one(params.project) } : undefined}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <PageContainer>
      <PageHeader eyebrow="Development" title="Tasks" description="Who does what, by when." />
      <Suspense fallback={<TasksToolbarFallback />}>
        <Toolbar />
      </Suspense>
      <Suspense
        fallback={
          <div className="rounded-lg border border-line bg-surface">
            <ListSkeleton rows={6} />
          </div>
        }
      >
        <TasksSection searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
