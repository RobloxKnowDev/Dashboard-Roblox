import {
  Bot,
  CircleCheck,
  CircleDot,
  CircleExclamationPoint,
  Hourglass,
  Image as ImageIcon,
  MessageSquare,
  Monitor,
  Play,
  Power,
  Rocket,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Markdown } from "@/features/assistant/markdown";
import { AGENT_STATUS } from "@/features/shared/status";
import type { Messages } from "@/i18n/messages";
import { getI18n, getT } from "@/i18n/server";
import { cn } from "@/lib/utils/cn";
import { CancelMessageButton } from "./client";
import { BRIDGE_ONLINE_MS, isActionSummary, type AgentEvent, type AgentMachine, type AgentMessage, type AgentStatus, type AgentSummary } from "./data";

export const AGENT_STATUS_ORDER = ["working", "waiting", "error", "completed", "offline"] as const satisfies readonly AgentStatus[];

/** Status label, with the reason when the agent waits. */
export function statusLabel(agent: Pick<AgentSummary, "status" | "waitingReason">, t: Messages): string {
  if (agent.status === "waiting" && agent.waitingReason) return t.agents.waiting[agent.waitingReason];
  return t.common.status.agent[agent.status];
}

export async function AgentStatusBadge({ agent }: { agent: Pick<AgentSummary, "status" | "waitingReason"> }) {
  const t = await getT();
  const meta = AGENT_STATUS[agent.status];
  return (
    <Badge tone={meta.tone} icon={<StatusDot tone={meta.tone} pulse={meta.pulse} />}>
      {statusLabel(agent, t)}
    </Badge>
  );
}

/** Status overview tiles — each one filters the list. */
export async function AgentStatusOverview({ agents, active }: { agents: AgentSummary[]; active: string | null }) {
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

/** "PC connected / offline" line above the list. */
export async function BridgeStatus({ machines, now }: { machines: AgentMachine[]; now: Date }) {
  const { t, f } = await getI18n();
  if (machines.length === 0) return <p className="text-xs text-fg-3">{t.agents.bridge.none}</p>;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
      {machines.map((machine) => {
        const online = Boolean(machine.lastSeenAt && now.getTime() - Date.parse(machine.lastSeenAt) < BRIDGE_ONLINE_MS);
        return (
          <li key={machine.id} className="flex items-center gap-2 text-xs">
            <StatusDot tone={online ? "good" : "neutral"} pulse={online} />
            <span className={online ? "text-fg-2" : "text-fg-3"}>{online ? t.agents.bridge.online(machine.name) : t.agents.bridge.offline(machine.name)}</span>
            <span className="text-fg-3">· {machine.lastSeenAt ? t.agents.bridge.seen(f.formatRelative(machine.lastSeenAt, now)) : t.agents.bridge.neverSeen}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function OriginIcon({ origin, className }: { origin: AgentSummary["origin"]; className?: string }) {
  const Icon = origin === "mission" ? Rocket : origin === "claude_code" ? Monitor : Bot;
  return <Icon className={cn("size-3.5", className)} aria-hidden />;
}

/** One line describing an event, for cards and grouped actions. */
export function eventLine(event: AgentEvent, t: Messages): string {
  const p = event.payload;
  switch (event.type) {
    case "action":
      if (!isActionSummary(p)) return t.agents.events.action;
      if (p.kind === "mcp") return t.agents.actions.mcp(String(p.server ?? ""), p.target);
      return t.agents.actions[p.kind](p.target);
    case "status_change":
    case "completed":
    case "started": {
      const kind = typeof p.kind === "string" ? p.kind : "";
      return kind in t.agents.timeline.status ? t.agents.timeline.status[kind as keyof Messages["agents"]["timeline"]["status"]] : t.agents.events[event.type];
    }
    case "error":
      if (event.message) return event.message;
      if (p.kind === "stop_failure") return t.agents.timeline.stopFailure(String(p.error ?? "unknown"));
      return typeof p.kind === "string" && p.kind in t.agents.timeline.status
        ? t.agents.timeline.status[p.kind as keyof Messages["agents"]["timeline"]["status"]]
        : t.agents.events.error;
    case "waiting":
      return event.message ?? t.agents.timeline.status.permission;
    default:
      return event.message ?? t.agents.events[event.type];
  }
}

export async function AgentCard({ agent, now }: { agent: AgentSummary; now: Date }) {
  const { t, f } = await getI18n();
  const last = agent.lastEvent;
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
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-3">
            <OriginIcon origin={agent.origin} />
            {t.agents.origin[agent.origin]}
            {agent.role !== "general" ? <> · {t.agents.roles[agent.role].label}</> : null}
            {agent.machineName ? <> · {agent.machineName}</> : null}
          </p>
        </div>
        <AgentStatusBadge agent={agent} />
      </div>
      {agent.mission ? <p className="mt-3 line-clamp-2 text-[13px] text-fg-2">{agent.mission}</p> : null}
      {last ? (
        <p
          className={cn(
            "mt-3 line-clamp-2 rounded-md border px-2.5 py-2 text-xs",
            last.type === "error" ? "border-critical/25 bg-critical/10 text-critical" : "border-line bg-surface-2/50 text-fg-3",
          )}
        >
          {eventLine(last, t)}
        </p>
      ) : null}
      <dl className="mt-auto grid grid-cols-2 gap-2 pt-4 text-[11px]">
        <div>
          <dt className="text-fg-3">{t.agents.card.started}</dt>
          <dd className="mt-0.5 text-fg-2">{agent.startedAt ? f.formatRelative(agent.startedAt, now) : "—"}</dd>
        </div>
        <div>
          <dt className="text-fg-3">{t.agents.card.lastActivity}</dt>
          <dd className="mt-0.5 text-fg-2">{agent.lastActivityAt ? f.formatRelative(agent.lastActivityAt, now) : t.agents.card.noActivity}</dd>
        </div>
      </dl>
    </Link>
  );
}

/* ─────────────────────────────── Timeline ─────────────────────────────── */

type Block = { kind: "event"; event: AgentEvent } | { kind: "actions"; id: string; events: AgentEvent[] };

/** Consecutive tool calls collapse into one block. */
function toBlocks(events: AgentEvent[]): Block[] {
  const blocks: Block[] = [];
  for (const event of events) {
    const previous = blocks.at(-1);
    if (event.type === "action" && previous?.kind === "actions") previous.events.push(event);
    else if (event.type === "action") blocks.push({ kind: "actions", id: event.id, events: [event] });
    else blocks.push({ kind: "event", event });
  }
  return blocks;
}

const STYLE: Record<string, { icon: LucideIcon; box: string }> = {
  instruction: { icon: MessageSquare, box: "border-info/25 bg-info/10 text-info" },
  reply: { icon: Bot, box: "border-accent/25 bg-accent-soft text-accent" },
  actions: { icon: Wrench, box: "border-line-strong bg-surface-2 text-fg-3" },
  screenshot: { icon: ImageIcon, box: "border-info/25 bg-info/10 text-info" },
  waiting: { icon: Hourglass, box: "border-warning/25 bg-warning/10 text-warning" },
  error: { icon: CircleExclamationPoint, box: "border-critical/25 bg-critical/10 text-critical" },
  completed: { icon: CircleCheck, box: "border-good/25 bg-good/10 text-good" },
  started: { icon: Play, box: "border-info/25 bg-info/10 text-info" },
  status_change: { icon: Power, box: "border-line-strong bg-surface-2 text-fg-3" },
  default: { icon: CircleDot, box: "border-line-strong bg-surface-2 text-fg-3" },
};

function TimelineItem({ style, title, time, children }: { style: { icon: LucideIcon; box: string }; title: string; time: ReactNode; children?: ReactNode }) {
  const Icon = style.icon;
  return (
    <li className="relative flex gap-3 px-3 py-2.5">
      <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border", style.box)}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
          <span className="font-medium text-fg">{title}</span>
          <span className="text-[11px] text-fg-3">{time}</span>
        </p>
        {children}
      </div>
    </li>
  );
}

/** Chronological history: instructions, grouped actions, replies, screenshots. */
export async function AgentTimeline({
  events,
  pending,
  hidden,
  now,
  canCancel,
}: {
  events: AgentEvent[];
  pending: AgentMessage[];
  hidden: number;
  now: Date;
  canCancel: boolean;
}) {
  const { t, f } = await getI18n();
  const time = (iso: string) => (
    <time dateTime={iso}>
      {f.formatTime(new Date(iso))} · {f.formatRelative(iso, now)}
    </time>
  );
  if (events.length === 0 && pending.length === 0) return <p className="px-5 py-8 text-center text-[13px] text-fg-3">{t.agents.timeline.empty}</p>;

  return (
    <div>
      {hidden > 0 ? <p className="px-5 pb-1 text-[11px] text-fg-3">{t.agents.timeline.hidden(hidden)}</p> : null}
      <ol className="relative space-y-0.5 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-line">
        {toBlocks(events).map((block) => {
          if (block.kind === "actions") {
            const shown = block.events.slice(-3);
            const earlier = block.events.slice(0, -3);
            const last = block.events.at(-1)!;
            return (
              <TimelineItem key={block.id} style={STYLE.actions!} title={t.agents.actions.group(block.events.length)} time={time(last.createdAt)}>
                {earlier.length > 0 ? (
                  <details className="mt-1 text-xs text-fg-3">
                    <summary className="cursor-pointer select-none hover:text-fg-2">{t.agents.actions.more(earlier.length)}</summary>
                    <ul className="mt-1 space-y-0.5 border-l border-line pl-3">
                      {earlier.map((event) => (
                        <li key={event.id} className="truncate">
                          {eventLine(event, t)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <ul className="mt-1 space-y-0.5 text-xs text-fg-2">
                  {shown.map((event) => (
                    <li key={event.id} className="truncate">
                      {eventLine(event, t)}
                    </li>
                  ))}
                </ul>
              </TimelineItem>
            );
          }

          const event = block.event;
          const style = STYLE[event.type] ?? STYLE.default!;
          if (event.type === "instruction") {
            const author = typeof event.payload.author === "string" ? event.payload.author : null;
            const title = event.payload.via === "dashboard" ? (author ? t.agents.timeline.fromDashboard(author) : t.agents.timeline.dashboard) : t.agents.timeline.fromVsCode;
            return (
              <TimelineItem key={event.id} style={style} title={title} time={time(event.createdAt)}>
                <p className="mt-1.5 whitespace-pre-wrap break-words rounded-md border border-line bg-surface-2/50 px-3 py-2 text-[13px] text-fg">{event.message}</p>
              </TimelineItem>
            );
          }
          if (event.type === "reply") {
            return (
              <TimelineItem key={event.id} style={style} title={t.agents.timeline.claude} time={time(event.createdAt)}>
                <div className="mt-1.5 min-w-0 break-words">
                  <Markdown source={event.message ?? ""} />
                </div>
              </TimelineItem>
            );
          }
          if (event.type === "screenshot") {
            return (
              <TimelineItem key={event.id} style={style} title={t.agents.events.screenshot} time={time(event.createdAt)}>
                {event.message ? <p className="mt-1 text-[13px] text-fg-2">{event.message}</p> : null}
                {event.imageUrl ? (
                  <a href={event.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block w-fit overflow-hidden rounded-md border border-line hover:border-line-strong">
                    {/* Signed URL from private storage: next/image would need the bucket as a remote pattern. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.imageUrl} alt={event.message ?? t.agents.events.screenshot} className="max-h-[420px] w-auto max-w-full" loading="lazy" />
                    <span className="sr-only">{t.agents.timeline.openImage}</span>
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-fg-3">{t.agents.timeline.imageUnavailable}</p>
                )}
              </TimelineItem>
            );
          }
          return (
            <TimelineItem key={event.id} style={style} title={eventLine(event, t)} time={time(event.createdAt)} />
          );
        })}
        {pending.map((message) => (
          <TimelineItem key={message.id} style={STYLE.waiting!} title={t.agents.timeline.pending} time={time(message.createdAt)}>
            <div className="mt-1.5 flex items-start gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded-md border border-dashed border-line-strong px-3 py-2 text-[13px] text-fg-2">{message.body}</p>
              {canCancel ? <CancelMessageButton messageId={message.id} /> : null}
            </div>
          </TimelineItem>
        ))}
      </ol>
    </div>
  );
}
