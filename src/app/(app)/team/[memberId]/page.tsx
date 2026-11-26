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
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatRelative } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Team member" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function MemberActivity({ profileId }: { profileId: string }) {
  const activity = await getRecentActivity(10, profileId);
  await connection();
  const now = new Date();
  if (activity === null) return <ErrorState compact description="Activity couldn't be loaded." />;
  if (activity.length === 0) {
    return <EmptyState compact icon={Activity} title="No activity yet" description="Changes this member makes will be listed here." />;
  }
  return (
    <ol className="space-y-0.5 px-2 pb-2">
      {activity.map((entry) => (
        <li key={entry.id} className="flex gap-3 rounded-md px-3 py-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-4" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg-2">{describeActivity(entry)}</p>
          <time dateTime={entry.createdAt} className="shrink-0 text-xs text-fg-3">
            {formatRelative(entry.createdAt, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

async function MemberDetail({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!UUID.test(memberId)) notFound();
  const [member, user] = await Promise.all([getTeamMember(memberId), requireUser()]);
  if (member === undefined) notFound();
  if (member === null) return <ErrorState description="This member couldn't be loaded. Refresh the page to try again." />;

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
          Team
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={member.name} src={member.avatarUrl} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{member.name}</h1>
                <AccessBadge access={member.access} />
                {member.status === "inactive" ? <Badge dot>Inactive</Badge> : null}
              </div>
              <p className="mt-1 text-[13px] text-fg-3">
                {member.studioRole || "No job title"} · since {formatDate(member.joinedAt)}
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
            Sign-in access and role are managed in{" "}
            <Link href="/settings/members" className="text-fg-2 underline-offset-2 hover:text-accent hover:underline">
              Settings → Members
            </Link>
            .
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Projects" description={`${member.projects.length} ${member.projects.length === 1 ? "project" : "projects"}`} />
          {member.projects.length === 0 ? (
            <EmptyState compact icon={FolderKanban} title="No projects" description="Add this member to a project from the project's edit form." />
          ) : (
            <ul className="px-2 pb-2">
              {member.projects.map((p) => {
                const status = PROJECT_STATUS[p.status];
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px] text-fg hover:bg-surface-2">
                      <span className="truncate">{p.name}</span>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Recent activity" description={member.profileId ? "Latest changes made by this member" : "Only members with an account have activity"} />
          {member.profileId ? (
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <MemberActivity profileId={member.profileId} />
            </Suspense>
          ) : (
            <EmptyState compact icon={Activity} title="No account" description="Changes are logged for people who sign in to the dashboard." />
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          Tasks <span className="text-sm font-normal text-fg-3">· {member.tasks.open} open, {member.tasks.done} done</span>
        </h2>
        <TaskTable
          tasks={memberTasks}
          today={today}
          options={taskOptions}
          newTaskDefaults={{ assigneeId: member.id }}
          permissions={{ canEdit: canEditTasks, canDeleteAny: canManage, userId: user.id }}
          emptyTitle="No tasks assigned"
          emptyDescription={canEditTasks ? "Create a task for this member." : "Tasks assigned to this member will show up here."}
        />
      </section>
    </>
  );
}

export default function TeamMemberPage({ params }: PageProps<"/team/[memberId]">) {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="space-y-4" role="status" aria-label="Loading member">
            <Skeleton className="h-14 w-80" />
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
