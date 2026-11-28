import { ArrowLeft, Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress, Skeleton } from "@/components/ui/primitives";
import { getProject, getProjectFormOptions } from "@/features/projects/data";
import { DeleteProjectButton, EditProjectButton } from "@/features/projects/project-form";
import { ProjectCover } from "@/features/projects/views";
import { PROJECT_STATUS } from "@/features/shared/status";
import { filterTasks, getTaskFormOptions, listTasks } from "@/features/tasks/data";
import { TaskTable } from "@/features/tasks/task-table";
import { getI18n, getT } from "@/i18n/server";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.projects.detail.metaTitle };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!UUID.test(projectId)) notFound();
  const [project, user, { t, f }] = await Promise.all([getProject(projectId), requireUser(), getI18n()]);
  const c = t.projects.detail;
  if (project === undefined) notFound();
  if (project === null) return <ErrorState description={c.loadError} />;

  const role = user.role ?? "viewer";
  const canEdit = hasMinRole(role, "developer");
  const canDelete = hasMinRole(role, "admin");
  const [projectOptions, taskOptions, tasks] = await Promise.all([getProjectFormOptions(), getTaskFormOptions(), listTasks()]);
  const projectTasks = tasks ? filterTasks(tasks, { view: "all", projectId: project.id }, user.id) : [];
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const status = PROJECT_STATUS[project.status];

  const editValues = {
    name: project.name,
    description: project.description ?? "",
    coverImageUrl: project.coverImageUrl ?? "",
    status: project.status,
    progress: project.progress,
    targetReleaseDate: project.targetReleaseDate ?? "",
    gameId: project.game?.id ?? "",
    memberIds: project.members.map((m) => m.id),
  };

  return (
    <>
      <div className="space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          {t.nav.items.projects.title}
        </Link>
        <ProjectCover project={project} className="h-36 rounded-lg border border-line" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{project.name}</h1>
              <Badge tone={status.tone} dot>
                {t.common.status.project[project.status]}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl whitespace-pre-line text-[13px] leading-relaxed text-fg-3">
              {project.description || t.projects.card.noDescription}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? <EditProjectButton options={projectOptions} project={{ id: project.id, values: editValues }} /> : null}
            {canDelete ? <DeleteProjectButton projectId={project.id} name={project.name} /> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-fg-3">{c.progress}</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{project.progress}%</p>
          <Progress value={project.progress} label={c.progressLabel} className="mt-3" tone={project.status === "completed" ? "good" : "accent"} />
          <p className="mt-3 text-xs text-fg-3">
            {c.tasksDone(project.tasks.done, project.tasks.done + project.tasks.open)}
          </p>
        </Card>
        <Card className="p-5">
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">{c.targetRelease}</dt>
              <dd className="text-fg tabular">{project.targetReleaseDate ? f.formatDate(project.targetReleaseDate) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">{c.created}</dt>
              <dd className="text-fg tabular">{f.formatDate(project.createdAt)}</dd>
            </div>
            {project.completedAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">{c.completed}</dt>
                <dd className="text-fg tabular">{f.formatDate(project.completedAt)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">{c.linkedGame}</dt>
              <dd className="min-w-0 truncate">
                {project.game ? (
                  <Link href={`/games/${project.game.id}`} className="inline-flex items-center gap-1.5 text-fg hover:text-accent-ink">
                    <Gamepad2 className="size-3.5 text-fg-3" aria-hidden />
                    <span className="truncate">{project.game.name}</span>
                  </Link>
                ) : (
                  <span className="text-fg-3">—</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-xs text-fg-3">{c.members}</p>
          {project.members.length === 0 ? (
            <p className="text-[13px] text-fg-3">{c.noMembers}</p>
          ) : (
            <ul className="space-y-2">
              {project.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 text-[13px] text-fg">
                  <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                  {m.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{c.tasks}</h2>
        <TaskTable
          tasks={projectTasks}
          today={today}
          options={taskOptions}
          hideProject
          newTaskDefaults={{ projectId: project.id }}
          permissions={{ canEdit, canDeleteAny: canDelete, userId: user.id }}
          emptyTitle={c.noTasksTitle}
          emptyDescription={canEdit ? c.noTasksCanEdit : c.noTasksReadOnly}
        />
      </section>
    </>
  );
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[projectId]">) {
  const t = await getT();
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="space-y-4" role="status" aria-label={t.projects.detail.loading}>
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <div className="rounded-lg border border-line bg-surface">
              <ListSkeleton rows={4} />
            </div>
          </div>
        }
      >
        <ProjectDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
