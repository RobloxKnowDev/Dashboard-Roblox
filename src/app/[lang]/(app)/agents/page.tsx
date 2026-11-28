import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { AutoRefresh, NewMissionButton } from "@/features/agents/client";
import { AGENT_STATUS_ORDER, AgentCard, AgentStatusOverview, BridgeStatus } from "@/features/agents/components";
import { isAgentController, knownFolders, listAgents, listMachines } from "@/features/agents/data";
import { getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.agents.title };
}

/** The controller's "New mission" button. */
async function HeaderAction() {
  const access = await checkAccess("admin");
  if (access.status !== "allowed" || !(await isAgentController(access.user.id))) return null;
  return <NewMissionButton folders={await knownFolders()} />;
}

async function AgentsSection({ searchParams }: { searchParams: PageProps<"/[lang]/agents">["searchParams"] }) {
  await connection();
  const now = new Date();
  const t = await getT();
  const value = (await searchParams).status;
  const status = AGENT_STATUS_ORDER.find((s) => s === value) ?? null;
  const [agents, machines, access] = await Promise.all([listAgents(), listMachines(), checkAccess("admin")]);
  const controller = access.status === "allowed" && (await isAgentController(access.user.id));

  if (!agents) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <ErrorState title={t.agents.page.errorTitle} description={t.agents.page.errorDescription} />
      </div>
    );
  }
  const shown = agents
    .filter((a) => !status || a.status === status)
    .sort((a, b) => AGENT_STATUS_ORDER.indexOf(a.status) - AGENT_STATUS_ORDER.indexOf(b.status));

  return (
    <>
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3">
        <BridgeStatus machines={machines} now={now} />
        {!controller ? <p className="text-xs text-fg-3">{t.agents.page.readOnly}</p> : null}
      </div>
      <AgentStatusOverview agents={agents} active={status} />
      {shown.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title={status ? t.agents.page.emptyStatusTitle(t.common.status.agent[status]) : t.agents.page.emptyTitle}
            description={status ? t.agents.page.emptyStatusDescription : t.agents.page.emptyDescription}
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((agent) => (
            <li key={agent.id}>
              <AgentCard agent={agent} now={now} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function AgentsPage({ searchParams }: PageProps<"/[lang]/agents">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={t.nav.sections.development}
        title={t.nav.items.agents.title}
        description={t.agents.page.description}
        actions={
          <Suspense fallback={null}>
            <HeaderAction />
          </Suspense>
        }
      />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-12 rounded-lg" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
          }
        >
          <AgentsSection searchParams={searchParams} />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
