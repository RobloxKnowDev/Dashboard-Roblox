import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { EmptyState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { AGENT_STATUS_ORDER, AgentCard, AgentStatusOverview } from "@/features/agents/components";
import { DEMO_AGENTS } from "@/features/agents/demo";
import { AGENT_STATUS } from "@/features/shared/status";

export const metadata: Metadata = { title: "AI Agents" };

async function AgentsSection({ searchParams }: { searchParams: PageProps<"/agents">["searchParams"] }) {
  const value = (await searchParams).status;
  const status = AGENT_STATUS_ORDER.find((s) => s === value) ?? null;
  // Errors first, then the rest by status order.
  const agents = [...DEMO_AGENTS]
    .filter((a) => !status || a.status === status)
    .sort((a, b) => AGENT_STATUS_ORDER.indexOf(a.status) - AGENT_STATUS_ORDER.indexOf(b.status) || (a.status === "error" ? -1 : 0));

  return (
    <>
      <AgentStatusOverview agents={DEMO_AGENTS} active={status} />
      {agents.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState title={`No ${status ? AGENT_STATUS[status].label.toLowerCase() : ""} agents`} description="Pick another status above." />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {agents.map((agent) => (
            <li key={agent.id}>
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AgentsPage({ searchParams }: PageProps<"/agents">) {
  return (
    <PageContainer>
      <PageHeader eyebrow="Development" title="AI Agents" description="Live status of every AI agent working for the studio." />
      <DemoBanner>
        No agent reports to the dashboard yet. In Phase 2, agents will send their status and events through an
        authenticated API, and this page will show them live. Everything below is illustrative.
      </DemoBanner>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        }
      >
        <AgentsSection searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
