import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { AutoRefresh, MessageComposer, StopAgentButton } from "@/features/agents/client";
import { AgentStatusBadge, AgentTimeline, OriginIcon, TeamCard } from "@/features/agents/components";
import { BRIDGE_ONLINE_MS, getAgentDetail, listMachines, type AgentSummary } from "@/features/agents/data";
import type { Messages } from "@/i18n/messages";
import { getI18n, getT } from "@/i18n/server";
import { can } from "@/lib/auth/roles";
import { checkAccess } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.agents.detail.metaTitle };
}

/** Where a message to this agent will go — shown under the message box. */
function deliveryHint(agent: AgentSummary, bridgeOnline: boolean, t: Messages): string {
  const h = t.agents.composer.hint;
  if (agent.status === "working") return h.working;
  if (!bridgeOnline) return h.offline;
  if (agent.origin === "mission") return h.mission;
  if (agent.origin === "claude_code" && agent.status === "waiting" && !agent.endedAt) return h.vscodeIdle;
  return h.background;
}

async function AgentDetail({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(agentId)) notFound();
  await connection();
  const now = new Date();
  const [detail, machines, access, { t, f }] = await Promise.all([getAgentDetail(agentId), listMachines(), checkAccess("admin"), getI18n()]);
  if (!detail) notFound();
  const { agent } = detail;
  const controller = access.status === "allowed" && can(access.user.role, "agents.pilot");
  const machine = machines.find((m) => m.name === agent.machineName) ?? machines[0];
  const bridgeOnline = Boolean(machine?.lastSeenAt && now.getTime() - Date.parse(machine.lastSeenAt) < BRIDGE_ONLINE_MS);
  const active = agent.status === "working" || detail.pending.length > 0;
  const canStop = controller && agent.status === "working" && agent.origin === "mission";

  const facts: [string, string][] = [
    ...(agent.projectName ? ([[t.agents.detail.game, agent.projectName]] as [string, string][]) : []),
    [t.agents.detail.origin, t.agents.origin[agent.origin]],
    [t.agents.detail.role, t.agents.roles[agent.role].label],
    [t.agents.detail.machine, agent.machineName ?? "—"],
    [t.agents.detail.folder, agent.cwd ?? "—"],
    [t.agents.detail.model, agent.model ?? "—"],
    [t.agents.detail.started, agent.startedAt ? `${f.formatDate(new Date(agent.startedAt))} · ${f.formatTime(new Date(agent.startedAt))}` : "—"],
    [t.agents.detail.lastActivity, agent.lastActivityAt ? f.formatRelative(agent.lastActivityAt, now) : "—"],
  ];
  if (agent.endedAt) facts.push([t.agents.detail.ended, f.formatRelative(agent.endedAt, now)]);

  return (
    <>
      <AutoRefresh intervalMs={active ? 3000 : 8000} />
      <div className="space-y-4">
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          {t.nav.items.agents.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{agent.name}</h1>
          <AgentStatusBadge agent={agent} />
          {canStop ? (
            <div className="ml-auto">
              <StopAgentButton agentId={agent.id} requested={agent.stopRequested} />
            </div>
          ) : null}
        </div>
        {agent.mission ? <p className="text-[13px] text-fg-3">{agent.mission}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex h-fit flex-col gap-4 lg:col-span-1">
          <Card className="p-5">
            <p className="mb-4 flex items-center gap-2 text-xs text-fg-3">
              <OriginIcon origin={agent.origin} />
              {t.agents.origin[agent.origin]}
            </p>
            <dl className="space-y-3 text-[13px]">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-fg-3">{label}</dt>
                  <dd className="min-w-0 break-words text-right text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {detail.team.length > 0 ? <TeamCard team={detail.team} currentId={agent.id} /> : null}
        </div>
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title={t.agents.timeline.title} description={t.agents.timeline.description} />
          <div className="px-2 pb-3 pt-2">
            <AgentTimeline events={detail.events} pending={detail.pending} hidden={detail.hiddenEvents} now={now} canCancel={controller} />
          </div>
          <div className="border-t border-line px-5 py-4">
            {controller ? (
              <MessageComposer agentId={agent.id} hint={deliveryHint(agent, bridgeOnline, t)} />
            ) : (
              <p className="text-xs text-fg-3">{t.agents.page.readOnly}</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

export default function AgentPage({ params }: PageProps<"/[lang]/agents/[agentId]">) {
  return (
    <PageContainer>
      <RequireRole min="admin">
        <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
          <AgentDetail params={params} />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
