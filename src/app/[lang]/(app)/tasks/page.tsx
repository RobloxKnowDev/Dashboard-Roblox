import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { filterTasks, getTaskFormOptions, listTasks } from "@/features/tasks/data";
import { parseTaskView } from "@/features/tasks/schemas";
import { TaskTable } from "@/features/tasks/task-table";
import { TasksToolbar, TasksToolbarFallback } from "@/features/tasks/tasks-toolbar";
import { getT } from "@/i18n/server";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.tasks.title };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

async function Toolbar() {
  const options = await getTaskFormOptions();
  return <TasksToolbar projects={options.projects} />;
}

async function TasksSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [user, tasks, options, t] = await Promise.all([requireUser(), listTasks(), getTaskFormOptions(), getT()]);
  if (tasks === null) return <ErrorState description={t.tasks.page.loadError} />;

  const view = parseTaskView(one(params.view));
  const filtered = filterTasks(
    tasks,
    { view, priority: one(params.priority), projectId: one(params.project), q: one(params.q) },
    user.id,
  );
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const role = user.role ?? "viewer";
  const empty = t.tasks.page.empty[view];

  return (
    <TaskTable
      tasks={filtered}
      today={today}
      options={options}
      permissions={{ canEdit: hasMinRole(role, "developer"), canDeleteAny: hasMinRole(role, "admin"), userId: user.id }}
      newTaskDefaults={one(params.project) ? { projectId: one(params.project) } : undefined}
      emptyTitle={empty.title}
      emptyDescription={empty.description}
    />
  );
}

export default async function TasksPage({ searchParams }: PageProps<"/[lang]/tasks">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.nav.sections.development} title={t.nav.items.tasks.title} description={t.tasks.page.description} />
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
