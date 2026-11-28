import { Activity, ArrowLeft, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { getRecentActivity } from "@/features/overview/live";
import { describeActivity } from "@/features/shared/activity";
import { PROJECT_STATUS } from "@/features/shared/status";
import { getTaskFormOptions, listTasks } from "@/features/tasks/data";
import { TaskTable } from "@/features/tasks/task-table";
import { AccessBadge } from "@/features/team/components";
import { getTeamMember } from "@/features/team/data";
import { DeleteMemberButton, EditMemberButton } from "@/features/team/member-form";
import { getI18n, getT } from "@/i18n/server";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.team.detail.metaTitle };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function MemberActivity({ profileId }: { profileId: string }) {
  const [activity, { t, f }] = await Promise.all([getRecentActivity(10, profileId), getI18n()]);
  const c = t.team.detail;
  await connection();
  const now = new Date();
  if (activity === null) return <ErrorState compact description={c.activityError} />;
  if (activity.length === 0) {
    return <EmptyState compact icon={Activity} title={c.noActivityTitle} description={c.noActivityDescription} />;
  }
  return (
    <ol className="space-y-0.5 px-2 pb-2">
      {activity.map((entry) => (
        <li key={entry.id} className="flex gap-3 rounded-md px-3 py-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-4" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg-2">{describeActivity(entry, t)}</p>
          <time dateTime={entry.createdAt} className="shrink-0 text-xs text-fg-3">
            {f.formatRelative(entry.createdAt, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

async function MemberDetail({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!UUID.test(memberId)) notFound();
  const [member, user, { t, f }] = await Promise.all([getTeamMember(memberId), requireUser(), getI18n()]);
  const c = t.team.detail;
  if (member === undefined) notFound();
  if (member === null) return <ErrorState description={c.loadError} />;

  const role = user.role ?? "viewer";
  const canManage = hasMinRole(role, "admin");
  const canEditTasks = hasMinRole(role, "developer");
  const [taskOptions, tasks] = await Promise.all([getTaskFormOptions(), listTasks()]);
  const memberTasks = (tasks ?? [])
    .filter((t) => t.assignee?.id === member.id)
    .sort((a, b) => Number(a.status === "done" || a.status === "cancelled") - Number(b.status === "done" || b.status === "cancelled"));
  await connection();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="space-y-4">
        <Link href="/team" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          {t.nav.items.team.title}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={member.name} src={member.avatarUrl} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{member.name}</h1>
                <AccessBadge access={member.access} />
                {member.status === "inactive" ? <Badge dot>{t.team.card.inactive}</Badge> : null}
              </div>
              <p className="mt-1 text-[13px] text-fg-3">
                {c.subtitle(member.studioRole || t.team.card.noJobTitle, f.formatDate(member.joinedAt))}
              </p>
            </div>
          </div>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-2">
              <EditMemberButton
                member={{
                  id: member.id,
                  hasAccount: member.access !== "none",
                  values: {
                    displayName: member.name,
                    studioRole: member.studioRole ?? "",
                    status: member.status,
                    avatarUrl: member.avatarUrl ?? "",
                    joinedAt: member.joinedAt,
                  },
                }}
              />
              {member.access === "none" ? <DeleteMemberButton memberId={member.id} name={member.name} /> : null}
            </div>
          ) : null}
        </div>
        {canManage && member.access !== "none" ? (
          <p className="text-xs text-fg-3">
            {c.accessNote.before}
            <Link href="/settings/members" className="text-fg-2 underline-offset-2 hover:text-accent-ink hover:underline">
              {c.accessNote.link}
            </Link>
            {c.accessNote.after}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={c.projectsTitle} description={c.projectCount(member.projects.length)} />
          {member.projects.length === 0 ? (
            <EmptyState compact icon={FolderKanban} title={c.noProjectsTitle} description={c.noProjectsDescription} />
          ) : (
            <ul className="px-2 pb-2">
              {member.projects.map((p) => {
                const status = PROJECT_STATUS[p.status];
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px] text-fg hover:bg-surface-2">
                      <span className="truncate">{p.name}</span>
                      <Badge tone={status.tone} dot>
                        {t.common.status.project[p.status]}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={c.activityTitle} description={member.profileId ? c.activityDescription : c.activityNoAccount} />
          {member.profileId ? (
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <MemberActivity profileId={member.profileId} />
            </Suspense>
          ) : (
            <EmptyState compact icon={Activity} title={c.noAccountTitle} description={c.noAccountDescription} />
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          {c.tasksTitle} <span className="text-sm font-normal text-fg-3">{c.tasksSummary(member.tasks.open, member.tasks.done)}</span>
        </h2>
        <TaskTable
          tasks={memberTasks}
          today={today}
          options={taskOptions}
          newTaskDefaults={{ assigneeId: member.id }}
          permissions={{ canEdit: canEditTasks, canDeleteAny: canManage, userId: user.id }}
          emptyTitle={c.noTasksTitle}
          emptyDescription={canEditTasks ? c.noTasksCanEdit : c.noTasksReadOnly}
        />
      </section>
    </>
  );
}

export default async function TeamMemberPage({ params }: PageProps<"/[lang]/team/[memberId]">) {
  const t = await getT();
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="space-y-4" role="status" aria-label={t.team.detail.loading}>
            <Skeleton className="h-14 w-80 max-w-full" />
            <div className="rounded-lg border border-line bg-surface">
              <ListSkeleton rows={4} />
            </div>
          </div>
        }
      >
        <MemberDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
