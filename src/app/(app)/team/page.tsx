import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { MemberCards } from "@/features/team/components";
import { listTeamMembers } from "@/features/team/data";
import { MemberFormModal } from "@/features/team/member-form";
import { checkAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Team" };

async function AddMemberAction() {
  const access = await checkAccess("admin");
  return access.status === "allowed" ? <MemberFormModal /> : null;
}

async function TeamSection() {
  const [members, access] = await Promise.all([listTeamMembers(), checkAccess("admin")]);
  if (members === null) return <ErrorState description="The team couldn't be loaded. Refresh the page to try again." />;
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Members appear here when accounts are created, or when you add people without an account."
          action={access.status === "allowed" ? <MemberFormModal /> : undefined}
        />
      </div>
    );
  }

  const withAccount = members.filter((m) => m.access !== "none").length;
  const openTasks = members.reduce((acc, m) => acc + m.tasks.open, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-3">
        {members.length} {members.length === 1 ? "member" : "members"} · {withAccount} with an account · {openTasks} open{" "}
        {openTasks === 1 ? "task" : "tasks"}
      </p>
      <MemberCards members={members} />
    </div>
  );
}

export default function TeamPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Team"
        eyebrow="Business"
        description="The people behind the studio, their projects and their work."
        actions={
          <Suspense fallback={null}>
            <AddMemberAction />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Loading the team">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-52 rounded-lg" />
            ))}
          </div>
        }
      >
        <TeamSection />
      </Suspense>
    </PageContainer>
  );
}
