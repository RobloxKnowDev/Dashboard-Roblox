import {
  Activity,
  Bot,
  CalendarClock,
  CircleExclamationPoint,
  DollarSign,
  FolderKanban,
  Gamepad2,
  Info,
  ListTodo,
  TrendingUp,
  TriangleExclamationPoint,
  Users,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { StatCard } from "@/components/data/stat-card";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ACTIVE_AGENT_STATUSES, AGENT_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/features/shared/status";
import { DEMO_NOW, type DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { formatCompact, formatCurrency, formatDelta, formatNumber, formatRelative } from "@/lib/utils/format";
import { CcuOverviewChart, GamePerformanceChart, RevenueOverviewChart, StudioGrowthChart } from "./charts";
import { DEMO_AGENTS, DEMO_ALERTS, DEMO_MARKET_HIGHLIGHTS, getDemoGameMetrics } from "./demo";
import { getRecentActivity, getStudioCounts, getUpcomingTasks } from "./live";
import { parseRange } from "./range";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function rangeFrom(searchParams: SearchParams) {
  return parseRange((await searchParams).range);
}

/* ─────────────────────────────── KPIs ─────────────────────────────── */

export async function KpiGrid({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  await connection();
  const today = new Date().toISOString().slice(0, 10);

  const metrics = getDemoGameMetrics(range); // DEMO — game analytics integration ships in Milestone C
  const counts = await getStudioCounts(today); // LIVE
  const activeAgents = DEMO_AGENTS.filter((a) => ACTIVE_AGENT_STATUSES.includes(a.status)).length; // DEMO

  const unavailable = "Couldn't load — retry in a moment";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatCurrency(metrics.revenue.total)}
          source="demo"
          icon={DollarSign}
          delta={metrics.revenue.delta}
          deltaLabel={range.comparison}
          trend={metrics.revenue.series.slice(-12).map((p) => p.value)}
        />
        <StatCard
          label="Total CCU"
          value={formatNumber(metrics.ccu.now)}
          source="demo"
          icon={Users}
          delta={metrics.ccu.delta}
          deltaLabel={range.comparison}
          trend={metrics.ccu.series.slice(-12).map((p) => p.value)}
        />
        <StatCard
          label="Total DAU"
          value={formatCompact(metrics.dau.average)}
          source="demo"
          icon={Activity}
          delta={metrics.dau.delta}
          deltaLabel={`daily average ${range.comparison}`}
          trend={metrics.dau.series.slice(-12).map((p) => p.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active games"
          value={counts.games ? formatNumber(counts.games.live) : "—"}
          source="live"
          icon={Gamepad2}
          hint={
            !counts.games
              ? unavailable
              : counts.games.total === 0
                ? "No games registered yet"
                : `${counts.games.total} tracked in total`
          }
        />
        <StatCard
          label="Active projects"
          value={counts.projects ? formatNumber(counts.projects.active) : "—"}
          source="live"
          icon={FolderKanban}
          hint={!counts.projects ? unavailable : counts.projects.active === 0 ? "No active project" : "Planning, in progress or testing"}
        />
        <StatCard
          label="Active agents"
          value={formatNumber(activeAgents)}
          source="demo"
          icon={Bot}
          hint={`${DEMO_AGENTS.length} agents in total`}
        />
        <StatCard
          label="Pending tasks"
          value={counts.tasks ? formatNumber(counts.tasks.pending) : "—"}
          source="live"
          icon={ListTodo}
          hint={
            !counts.tasks
              ? unavailable
              : counts.tasks.overdue > 0
                ? `${counts.tasks.overdue} overdue`
                : counts.tasks.pending === 0
                  ? "Nothing waiting"
                  : "None overdue"
          }
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────── Charts ─────────────────────────────── */

export async function OverviewCharts({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  const metrics = getDemoGameMetrics(range);
  const common = { granularity: range.granularity, source: "demo" as const, rangeLabel: range.label };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <RevenueOverviewChart points={metrics.revenue.series} {...common} />
      <CcuOverviewChart points={metrics.ccu.series} {...common} />
      <GamePerformanceChart games={metrics.perGame} source="demo" rangeLabel={range.label} />
      <StudioGrowthChart points={metrics.growth} {...common} />
    </div>
  );
}

/* ─────────────────────────────── Lists ─────────────────────────────── */

function ListCard({
  title,
  description,
  source,
  href,
  children,
}: {
  title: string;
  description?: string;
  source: DataSource;
  href?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        description={description}
        actions={
          <>
            <SourceBadge source={source} />
            {href ? (
              <Link href={href} className="text-xs text-fg-3 transition-colors hover:text-accent">
                View all
              </Link>
            ) : null}
          </>
        }
      />
      <div className="flex-1 px-2 pb-2 pt-2">{children}</div>
    </Card>
  );
}

function dueLabel(due: string, today: string): { text: string; overdue: boolean } {
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { text: `${-days}d overdue`, overdue: true };
  if (days === 0) return { text: "Today", overdue: false };
  if (days === 1) return { text: "Tomorrow", overdue: false };
  return { text: `In ${days}d`, overdue: false };
}

export async function UpcomingTasks() {
  const tasks = await getUpcomingTasks();
  await connection();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ListCard title="Upcoming tasks" description="Next deadlines" source="live" href="/tasks">
      {tasks === null ? (
        <ErrorState compact description="Tasks couldn't be loaded. Refresh the page to try again." />
      ) : tasks.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="No upcoming tasks" description="Pending tasks and their deadlines will show up here." />
      ) : (
        <ul>
          {tasks.map((task) => {
            const due = task.dueDate ? dueLabel(task.dueDate, today) : null;
            const priority = TASK_PRIORITY[task.priority];
            return (
              <li key={task.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
                <Badge tone={priority.tone} dot className="w-[4.5rem] justify-center">
                  {priority.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{task.title}</p>
                  <p className="truncate text-xs text-fg-3">
                    {[task.project, task.assignee ?? "Unassigned", TASK_STATUS[task.status].label].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={cn("shrink-0 text-xs tabular", due?.overdue ? "font-medium text-critical" : "text-fg-3")}>
                  {due?.text ?? "No date"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ListCard>
  );
}

const ENTITY_LABELS: Record<string, string> = {
  task: "task",
  project: "project",
  game: "game",
  team_member: "member",
  finance_transaction: "transaction",
};

function describeActivity(entry: { action: string; entityType: string; entityLabel: string | null; metadata: unknown }) {
  const entity = ENTITY_LABELS[entry.entityType] ?? entry.entityType.replace(/_/g, " ");
  const name = entry.entityLabel ? ` “${entry.entityLabel}”` : "";
  if (entry.action === "status_changed") {
    const to = (entry.metadata as { to?: unknown } | null)?.to;
    const toLabel = typeof to === "string" ? to.replace(/_/g, " ") : "a new status";
    return `moved ${entity}${name} to ${toLabel}`;
  }
  const verb = entry.action === "created" ? "created" : entry.action === "deleted" ? "deleted" : "updated";
  return `${verb} ${entity}${name}`;
}

export async function RecentActivity() {
  const activity = await getRecentActivity();
  await connection();
  const now = new Date();

  return (
    <ListCard title="Recent activity" description="What changed in the studio" source="live">
      {activity === null ? (
        <ErrorState compact description="Activity couldn't be loaded. Refresh the page to try again." />
      ) : activity.length === 0 ? (
        <EmptyState compact icon={Activity} title="No activity yet" description="Changes to games, projects, tasks and the team will be logged here automatically." />
      ) : (
        <ol className="space-y-0.5">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-3 rounded-md px-3 py-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-4" aria-hidden />
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg-2">
                <span className="font-medium text-fg">{entry.actor ?? "Someone"}</span> {describeActivity(entry)}
              </p>
              <time dateTime={entry.createdAt} className="shrink-0 text-xs text-fg-3">
                {formatRelative(entry.createdAt, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </ListCard>
  );
}

export function ActiveAgents() {
  return (
    <ListCard title="Active agents" description="Live status of AI agents" source="demo" href="/agents">
      <ul>
        {DEMO_AGENTS.map((agent) => {
          const status = AGENT_STATUS[agent.status];
          const lastActivity = new Date(DEMO_NOW.getTime() - agent.lastActivityMinutesAgo * 60_000);
          return (
            <li key={agent.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
              <StatusDot tone={status.tone} pulse={status.pulse} label={status.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">
                  {agent.name} <span className="font-normal text-fg-3">· {agent.project}</span>
                </p>
                <p className="truncate text-xs text-fg-3">{agent.mission}</p>
              </div>
              <div className="shrink-0 text-right">
                <Badge tone={status.tone}>{status.label}</Badge>
                <p className="mt-1 text-[11px] text-fg-3">{formatRelative(lastActivity, DEMO_NOW)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}

export function MarketHighlights() {
  return (
    <ListCard title="Market highlights" description="Fastest-growing Roblox experiences this week" source="demo" href="/discover">
      <ol>
        {DEMO_MARKET_HIGHLIGHTS.map((game, index) => (
          <li key={game.name} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
            <span className="w-4 shrink-0 font-mono text-xs text-fg-3">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg">{game.name}</p>
              <p className="text-xs text-fg-3">{formatCompact(game.ccu)} playing</p>
            </div>
            <Badge>{game.genre}</Badge>
            <span className="inline-flex w-16 shrink-0 items-center justify-end gap-0.5 text-xs font-medium text-good">
              <TrendingUp className="size-3.5" aria-hidden />
              {formatDelta(game.growth)}
            </span>
          </li>
        ))}
      </ol>
      <p className="px-3 pb-1 pt-2 text-[11px] text-fg-3">Growth in concurrent players over 7 days.</p>
    </ListCard>
  );
}

const ALERT_STYLE = {
  critical: { icon: CircleExclamationPoint, tone: "critical" as const, label: "Critical", box: "border-critical/25 bg-critical/10 text-critical" },
  warning: { icon: TriangleExclamationPoint, tone: "warning" as const, label: "Warning", box: "border-warning/25 bg-warning/10 text-warning" },
  info: { icon: Info, tone: "info" as const, label: "Info", box: "border-info/25 bg-info/10 text-info" },
};

export function ImportantAlerts() {
  return (
    <ListCard title="Important alerts" description="What needs your attention" source="demo">
      <ul className="space-y-1">
        {DEMO_ALERTS.map((alert) => {
          const style = ALERT_STYLE[alert.severity];
          const Icon = style.icon;
          return (
            <li key={alert.id}>
              <Link href={alert.href} className="flex gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", style.box)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-fg">{alert.title}</p>
                  <p className="truncate text-xs text-fg-3">{alert.detail}</p>
                </div>
                <Badge tone={style.tone} className="self-start">
                  {style.label}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}

