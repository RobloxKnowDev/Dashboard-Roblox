import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoBadge } from "@/components/feedback/demo-badge";
import { PageContainer } from "@/components/layout/page-header";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { AgentTimeline } from "@/features/agents/components";
import { DEMO_AGENTS, demoTime, getDemoAgent } from "@/features/agents/demo";
import { AGENT_STATUS } from "@/features/shared/status";
import { DEMO_NOW } from "@/lib/data/source";
import { formatDate, formatRelative, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "AI Agent" };

/** Demo agents are known in advance: prerender their pages. */
export function generateStaticParams() {
  return DEMO_AGENTS.map((agent) => ({ agentId: agent.id }));
}

async function AgentDetail({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = getDemoAgent(agentId);
  if (!agent) notFound();
  const meta = AGENT_STATUS[agent.status];
  const started = demoTime(agent.startedMinutesAgo);
  const last = demoTime(agent.lastActivityMinutesAgo);

  return (
    <>
      <div className="space-y-4">
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          AI Agents
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{agent.name}</h1>
          <Badge tone={meta.tone} icon={<StatusDot tone={meta.tone} pulse={meta.pulse} />}>
            {meta.label}
          </Badge>
          <DemoBadge />
        </div>
        <p className="text-[13px] text-fg-3">{agent.mission}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <dl className="space-y-3 text-[13px]">
            {[
              ["Project", agent.project],
              ["Model", agent.model],
              ["Started", `${formatDate(started)} · ${formatTime(started)}`],
              ["Last activity", formatRelative(last, DEMO_NOW)],
              ["Events", String(agent.events.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-fg-3">{label}</dt>
                <dd className="text-right text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Event history" description="Everything the agent reported, newest first" actions={<DemoBadge />} />
          <div className="px-2 pb-3 pt-2">
            <AgentTimeline events={agent.events} />
          </div>
        </Card>
      </div>
    </>
  );
}

export default function AgentPage({ params }: PageProps<"/agents/[agentId]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
        <AgentDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
