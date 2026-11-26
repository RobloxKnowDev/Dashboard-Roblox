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
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Project" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!UUID.test(projectId)) notFound();
  const [project, user] = await Promise.all([getProject(projectId), requireUser()]);
  if (project === undefined) notFound();
  if (project === null) return <ErrorState description="This project couldn't be loaded. Refresh the page to try again." />;

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
          Projects
        </Link>
        <ProjectCover project={project} className="h-36 rounded-lg border border-line" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{project.name}</h1>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl whitespace-pre-line text-[13px] leading-relaxed text-fg-3">
              {project.description || "No description."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? <EditProjectButton options={projectOptions} project={{ id: project.id, values: editValues }} /> : null}
            {canDelete ? <DeleteProjectButton projectId={project.id} name={project.name} /> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-fg-3">Progress</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{project.progress}%</p>
          <Progress value={project.progress} label="Project progress" className="mt-3" tone={project.status === "completed" ? "good" : "accent"} />
          <p className="mt-3 text-xs text-fg-3">
            {project.tasks.done} of {project.tasks.done + project.tasks.open} tasks done
          </p>
        </Card>
        <Card className="p-5">
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">Target release</dt>
              <dd className="text-fg tabular">{project.targetReleaseDate ? formatDate(project.targetReleaseDate) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">Created</dt>
              <dd className="text-fg tabular">{formatDate(project.createdAt)}</dd>
            </div>
            {project.completedAt ? (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">Completed</dt>
                <dd className="text-fg tabular">{formatDate(project.completedAt)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">Linked game</dt>
              <dd className="min-w-0 truncate">
                {project.game ? (
                  <Link href={`/games/${project.game.id}`} className="inline-flex items-center gap-1.5 text-fg hover:text-accent">
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
          <p className="mb-3 text-xs text-fg-3">Members</p>
          {project.members.length === 0 ? (
            <p className="text-[13px] text-fg-3">No members assigned.</p>
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
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Tasks</h2>
        <TaskTable
          tasks={projectTasks}
          today={today}
          options={taskOptions}
          hideProject
          newTaskDefaults={{ projectId: project.id }}
          permissions={{ canEdit, canDeleteAny: canDelete, userId: user.id }}
          emptyTitle="No tasks in this project"
          emptyDescription={canEdit ? "Create the first task to start tracking this project." : "Tasks for this project will show up here."}
        />
      </section>
    </>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="space-y-4" role="status" aria-label="Loading project">
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-7 w-72" />
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
