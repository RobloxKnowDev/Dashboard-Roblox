import {
  Activity,
  Bot,
  CalendarClock,
  CircleExclamationPoint,
  Coins,
  FolderKanban,
  Gamepad2,
  Info,
  KeyRound,
  ListTodo,
  ShieldCheck,
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
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DEMO_AGENTS, demoTime } from "@/features/agents/demo";
import { describeActivity } from "@/features/shared/activity";
import { parseRange } from "@/features/shared/range";
import { MetricBarChart, MetricChart } from "@/features/shared/metric-chart";
import { ACTIVE_AGENT_STATUSES, AGENT_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/features/shared/status";
import { DEMO_NOW, type DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { formatCompact, formatCurrency, formatDelta, formatNumber, formatRelative, formatRobux } from "@/lib/utils/format";
import { getChart } from "@/features/discover/data";
import { revenueChart } from "@/features/games/payouts-compute";
import { getRecentActivity, getStudioCounts, getUpcomingTasks } from "./live";
import { getStudioMetrics } from "./studio";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function rangeFrom(searchParams: SearchParams) {
  return parseRange((await searchParams).range);
}

async function todayIso() {
  await connection();
  return new Date().toISOString().slice(0, 10);
}

function delta(current: number | null, previous: number | null): number | undefined {
  return current !== null && previous !== null && previous > 0 ? current / previous - 1 : undefined;
}

/* ─────────────────────────────── KPIs ─────────────────────────────── */

export async function KpiGrid({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  const today = await todayIso();
  const [studio, counts] = await Promise.all([getStudioMetrics(range.key, today), getStudioCounts(today)]);
  const activeAgents = DEMO_AGENTS.filter((a) => ACTIVE_AGENT_STATUSES.includes(a.status)).length; // DEMO
  const unavailable = "Couldn't load — retry in a moment";
  const comparison = range.granularity === "month" ? undefined : range.comparison;

  const ok = studio.status === "ok";
  const hasAnalytics = ok && studio.analyticsCount > 0;
  const coverage = ok ? `${studio.analyticsCount} of ${studio.gameCount} games` : "";
  const noData =
    studio.status === "no_games" ? "Add a game in My Games" : studio.status === "error" ? unavailable : "Analytics not authorized for your games";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={hasAnalytics ? formatRobux(studio.revenue.total) : "—"}
          source="live"
          icon={Coins}
          delta={hasAnalytics ? delta(studio.revenue.total, studio.revenue.previous) : undefined}
          deltaLabel={comparison}
          hint={
            hasAnalytics
              ? `≈ ${formatCurrency(studio.revenue.total * studio.devexRate)} · ${studio.revenue.rewards > 0 ? `incl. ${formatRobux(studio.revenue.rewards)} rewards` : coverage}`
              : noData
          }
          trend={hasAnalytics ? studio.revenue.series.slice(-12).map((p) => p.value) : undefined}
        />
        <StatCard
          label="Total CCU"
          value={ok && studio.playingNow !== null ? formatNumber(studio.playingNow) : "—"}
          source="live"
          icon={Users}
          hint={
            ok
              ? studio.playingNow === null
                ? "Roblox unreachable right now"
                : `Players online now · ${studio.gameCount} game${studio.gameCount > 1 ? "s" : ""}`
              : noData
          }
        />
        <StatCard
          label="Total DAU"
          value={hasAnalytics && studio.dau.average !== null ? formatCompact(Math.round(studio.dau.average)) : "—"}
          source="live"
          icon={Activity}
          delta={hasAnalytics ? delta(studio.dau.average, studio.dau.previous) : undefined}
          deltaLabel={comparison ? `daily average ${comparison}` : undefined}
          hint={hasAnalytics ? `Daily average · ${coverage}` : noData}
          trend={hasAnalytics ? studio.dau.series.slice(-12).map((p) => p.value) : undefined}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active games"
          value={counts.games ? formatNumber(counts.games.live) : "—"}
          source="live"
          icon={Gamepad2}
          hint={!counts.games ? unavailable : counts.games.total === 0 ? "No games registered yet" : `${counts.games.total} tracked in total`}
        />
        <StatCard
          label="Active projects"
          value={counts.projects ? formatNumber(counts.projects.active) : "—"}
          source="live"
          icon={FolderKanban}
          hint={!counts.projects ? unavailable : counts.projects.active === 0 ? "No active project" : "Planning, in progress or testing"}
        />
        <StatCard label="Active agents" value={formatNumber(activeAgents)} source="demo" icon={Bot} hint={`${DEMO_AGENTS.length} agents in total`} />
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
  const studio = await getStudioMetrics(range.key, await todayIso());

  if (studio.status !== "ok" || studio.analyticsCount === 0) {
    return (
      <Card>
        <EmptyState
          icon={studio.status === "ok" ? KeyRound : Gamepad2}
          title={studio.status === "no_games" ? "Add your games to see charts" : studio.status === "error" ? "Charts unavailable" : "No analytics yet"}
          description={
            studio.status === "no_games"
              ? "Revenue, players and growth charts are built from your games' Roblox analytics."
              : studio.status === "error"
                ? "Your games couldn't be loaded. Refresh the page to try again."
                : "Your Roblox API key isn't authorized for any of your games' analytics yet. Open a game for the steps to fix it."
          }
          action={
            <Link href="/games" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Go to My Games
            </Link>
          }
        />
      </Card>
    );
  }

  const rows = (key: string, points: { date: string; value: number }[]) => points.map((p) => ({ date: p.date, [key]: p.value }));
  const common = { source: "live" as const, granularity: range.granularity };
  const coverage = `${studio.analyticsCount} of ${studio.gameCount} games`;

  return (
    <div className="space-y-2">
      <div className="grid gap-4 xl:grid-cols-2">
        <MetricChart
          title="Revenue overview"
          description={`Robux earned per ${range.granularity}, ${range.label} · ${coverage}`}
          label={`Robux earned per ${range.granularity}, ${range.label}: game sales and rewards`}
          format="robux"
          {...revenueChart(studio.revenue.salesSeries, studio.revenue.rewardsSeries)}
          {...common}
        />
        <MetricChart
          title="CCU overview"
          description={`Daily peak concurrent players (Roblox keeps 28 days) · ${coverage}`}
          label="Daily peak concurrent players, last 28 days at most"
          format="compact"
          variant="line"
          rows={rows("ccu", studio.peakCcu)}
          series={[{ key: "ccu", label: "Peak players" }]}
          {...common}
        />
        <MetricBarChart
          title="Game performance"
          description={`Visits per game, ${range.label}`}
          label={`Visits per game, ${range.label}`}
          format="compact"
          rows={[...studio.perGame].sort((a, b) => b.visits - a.visits)}
          series={[{ key: "visits", label: "Visits" }]}
          source="live"
        />
        <MetricChart
          title="Studio growth"
          description={`Lifetime visits, ${range.label} · ${coverage}`}
          label={`Cumulative lifetime visits, ${range.label}`}
          format="compact"
          rows={rows("visits", studio.growth)}
          series={[{ key: "visits", label: "Lifetime visits" }]}
          {...common}
        />
      </div>
      {studio.unauthorized.length > 0 ? (
        <p className="text-[11px] text-fg-3">
          Not included (analytics not authorized): {studio.unauthorized.map((g) => g.name).join(", ")}.
        </p>
      ) : null}
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
  const today = await todayIso();

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
                {/* No actor = done by the system (server-side job or setup script). */}
                <span className="font-medium text-fg">{entry.actor ?? "System"}</span> {describeActivity(entry)}
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
                <p className="mt-1 text-[11px] text-fg-3">{formatRelative(demoTime(agent.lastActivityMinutesAgo), DEMO_NOW)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}

/** Live: the top of Roblox's Up-and-Coming chart. */
export async function MarketHighlights() {
  const chart = await getChart("up-and-coming", await todayIso());

  return (
    <ListCard title="Market highlights" description="Top of Roblox's Up-and-Coming chart right now" source="live" href="/discover?chart=up-and-coming">
      {chart.status !== "ok" ? (
        <ErrorState compact title="Market data unavailable" description="Roblox's charts couldn't be reached. Try again later." />
      ) : (
        <>
          <ol>
            {chart.games.slice(0, 5).map((game, index) => {
              const change = game.playersYesterday ? game.playerCount / game.playersYesterday - 1 : null;
              return (
                <li key={game.universeId} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
                  <span className="w-4 shrink-0 font-mono text-xs text-fg-3">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-fg">{game.name}</p>
                    <p className="text-xs text-fg-3">{formatCompact(game.playerCount)} playing</p>
                  </div>
                  {game.genre ? <Badge>{game.genre}</Badge> : null}
                  <span
                    className={cn(
                      "inline-flex w-16 shrink-0 items-center justify-end gap-0.5 text-xs font-medium",
                      change === null ? "text-fg-4" : change >= 0 ? "text-good" : "text-critical",
                    )}
                  >
                    {change === null ? (
                      "—"
                    ) : (
                      <>
                        <TrendingUp className={cn("size-3.5", change < 0 && "rotate-180")} aria-hidden />
                        {formatDelta(change)}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="px-3 pb-1 pt-2 text-[11px] text-fg-3">
            {chart.hasHistory ? "Change in players since yesterday's snapshot." : "Day-over-day change appears after the first daily snapshot."}
          </p>
        </>
      )}
    </ListCard>
  );
}

const ALERT_STYLE = {
  critical: { icon: CircleExclamationPoint, tone: "critical" as const, label: "Critical", box: "border-critical/25 bg-critical/10 text-critical" },
  warning: { icon: TriangleExclamationPoint, tone: "warning" as const, label: "Warning", box: "border-warning/25 bg-warning/10 text-warning" },
  info: { icon: Info, tone: "info" as const, label: "Info", box: "border-info/25 bg-info/10 text-info" },
};

type AlertItem = { id: string; severity: keyof typeof ALERT_STYLE; title: string; detail: string; href: string };

export async function ImportantAlerts({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  const studio = await getStudioMetrics(range.key, await todayIso());

  const items: AlertItem[] = [];
  if (studio.status === "ok") {
    if (!studio.robloxReachable) {
      items.push({ id: "roblox", severity: "warning", title: "Roblox is unreachable", detail: "Live player counts are temporarily unavailable", href: "/games" });
    }
    for (const alert of studio.alerts) items.push({ ...alert, href: "/games" });
    for (const game of studio.unauthorized) {
      items.push({
        id: `auth-${game.id}`,
        severity: "info",
        title: "Analytics not authorized",
        detail: `${game.name} · add it to your Roblox API key to see DAU, revenue and retention`,
        href: `/games/${game.id}`,
      });
    }
  }
  const order = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <ListCard title="Important alerts" description={`What needs your attention · ${range.label}`} source="live">
      {studio.status === "error" ? (
        <ErrorState compact description="Alerts couldn't be computed. Refresh the page to try again." />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          icon={ShieldCheck}
          title="No alerts"
          description={studio.status === "no_games" ? "Alerts are computed from your games' analytics." : "Players, retention and revenue are within normal ranges."}
        />
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 6).map((alert) => {
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
      )}
    </ListCard>
  );
}
