import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { MemberCards } from "@/features/team/components";
import { listTeamMembers } from "@/features/team/data";
import { MemberFormModal } from "@/features/team/member-form";
import { getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.team.title };
}

async function AddMemberAction() {
  const access = await checkAccess("admin");
  return access.status === "allowed" ? <MemberFormModal /> : null;
}

async function TeamSection() {
  const [members, access, t] = await Promise.all([listTeamMembers(), checkAccess("admin"), getT()]);
  const c = t.team.page;
  if (members === null) return <ErrorState description={c.loadError} />;
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Users}
          title={c.emptyTitle}
          description={c.emptyDescription}
          action={access.status === "allowed" ? <MemberFormModal /> : undefined}
        />
      </div>
    );
  }

  const withAccount = members.filter((m) => m.access !== "none").length;
  const openTasks = members.reduce((acc, m) => acc + m.tasks.open, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-3">{c.summary(members.length, withAccount, openTasks)}</p>
      <MemberCards members={members} />
    </div>
  );
}

export default async function TeamPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        title={t.nav.items.team.title}
        eyebrow={t.nav.sections.business}
        description={t.team.page.description}
        actions={
          <Suspense fallback={null}>
            <AddMemberAction />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label={t.team.page.loading}>
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
