import {
  CircleCheck,
  CircleDot,
  CircleExclamationPoint,
  Clock,
  FileText,
  Hourglass,
  Play,
  Power,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge, StatusDot } from "@/components/ui/badge";
import { AGENT_STATUS } from "@/features/shared/status";
import type { Messages } from "@/i18n/messages";
import { getI18n, getT } from "@/i18n/server";
import { DEMO_NOW } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { demoTime, type DemoAgent, type DemoAgentEvent } from "./demo";

export const AGENT_STATUS_ORDER = ["working", "waiting", "error", "completed", "offline"] as const;

/** Status overview tiles — each one filters the list. */
export async function AgentStatusOverview({ agents, active }: { agents: DemoAgent[]; active: string | null }) {
  const t = await getT();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {AGENT_STATUS_ORDER.map((status) => {
        const meta = AGENT_STATUS[status];
        const count = agents.filter((a) => a.status === status).length;
        const selected = active === status;
        return (
          <Link
            key={status}
            href={selected ? "/agents" : `/agents?status=${status}`}
            aria-pressed={selected}
            scroll={false}
            className={cn(
              "rounded-lg border bg-surface p-4 transition-colors",
              selected ? "border-accent/50 bg-accent-soft" : "border-line hover:border-line-strong",
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-fg-2">
              <StatusDot tone={meta.tone} pulse={meta.pulse && count > 0} />
              {t.common.status.agent[status]}
            </span>
            <span className="mt-2 block text-2xl font-semibold text-fg tabular">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function duration(fromMinutesAgo: number, toMinutesAgo: number, t: Messages): string {
  const d = t.agents.duration;
  const minutes = Math.max(0, fromMinutesAgo - toMinutesAgo);
  if (minutes < 60) return d.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? d.hours(hours, minutes % 60) : d.days(Math.floor(hours / 24));
}

export async function AgentCard({ agent }: { agent: DemoAgent }) {
  const { t, f, locale } = await getI18n();
  const meta = AGENT_STATUS[agent.status];
  const last = agent.events.at(-1);
  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "group flex h-full flex-col rounded-lg border bg-surface p-4 transition-colors hover:border-line-strong",
        agent.status === "error" ? "border-critical/30" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg group-hover:text-accent">{agent.name}</h3>
          <p className="truncate text-xs text-fg-3">{agent.project}</p>
        </div>
        <Badge tone={meta.tone} icon={<StatusDot tone={meta.tone} pulse={meta.pulse} />}>
          {t.common.status.agent[agent.status]}
        </Badge>
      </div>
      <p className="mt-3 text-[13px] text-fg-2">{agent.missions[locale]}</p>
      {last ? (
        <p className={cn("mt-3 line-clamp-2 rounded-md border px-2.5 py-2 text-xs", last.type === "error" ? "border-critical/25 bg-critical/10 text-critical" : "border-line bg-surface-2/50 text-fg-3")}>
          {last.messages[locale]}
        </p>
      ) : null}
      <dl className="mt-auto grid grid-cols-3 gap-2 pt-4 text-[11px]">
        <div>
          <dt className="text-fg-3">{t.agents.card.started}</dt>
          <dd className="mt-0.5 text-fg-2">{f.formatRelative(demoTime(agent.startedMinutesAgo), DEMO_NOW)}</dd>
        </div>
        <div>
          <dt className="text-fg-3">{t.agents.card.lastActivity}</dt>
          <dd className="mt-0.5 text-fg-2">{f.formatRelative(demoTime(agent.lastActivityMinutesAgo), DEMO_NOW)}</dd>
        </div>
        <div>
          <dt className="text-fg-3">{t.agents.card.runningFor}</dt>
          <dd className="mt-0.5 text-fg-2">{duration(agent.startedMinutesAgo, agent.lastActivityMinutesAgo, t)}</dd>
        </div>
      </dl>
    </Link>
  );
}

const EVENT_STYLE: Record<DemoAgentEvent["type"], { icon: LucideIcon; box: string }> = {
  started: { icon: Play, box: "border-info/25 bg-info/10 text-info" },
  progress: { icon: CircleDot, box: "border-accent/25 bg-accent-soft text-accent" },
  waiting: { icon: Hourglass, box: "border-warning/25 bg-warning/10 text-warning" },
  completed: { icon: CircleCheck, box: "border-good/25 bg-good/10 text-good" },
  error: { icon: CircleExclamationPoint, box: "border-critical/25 bg-critical/10 text-critical" },
  log: { icon: FileText, box: "border-line-strong bg-surface-2 text-fg-3" },
  status_change: { icon: Power, box: "border-line-strong bg-surface-2 text-fg-3" },
};

/** Vertical event history, newest first. */
export async function AgentTimeline({ events }: { events: DemoAgentEvent[] }) {
  const { t, f, locale } = await getI18n();
  const ordered = [...events].sort((a, b) => a.minutesAgo - b.minutesAgo);
  return (
    <ol className="relative space-y-1 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-line">
      {ordered.map((event) => {
        const style = EVENT_STYLE[event.type];
        const Icon = style.icon;
        const time = demoTime(event.minutesAgo);
        return (
          <li key={event.id} className="relative flex gap-3 rounded-md px-3 py-2.5">
            <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border", style.box)}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[13px] text-fg">{event.messages[locale]}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-3">
                <span className="font-medium text-fg-2">{t.agents.events[event.type]}</span>·
                <Clock className="size-3" aria-hidden />
                <time dateTime={time.toISOString()}>
                  {f.formatTime(time)} · {f.formatRelative(time, DEMO_NOW)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
