import {
  Activity,
  Bot,
  CalendarClock,
  CircleExclamationPoint,
  Coins,
  DollarSign,
  FolderKanban,
  Gamepad2,
  Info,
  KeyRound,
  ListTodo,
  MousePointerClick,
  ShieldCheck,
  TrendingUp,
  TriangleExclamationPoint,
  Users,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { StatCard } from "@/components/data/stat-card";
import { SummaryPanel, type SummaryFigure } from "@/components/data/summary-panel";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge, StatusDot } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { statusLabel } from "@/features/agents/components";
import { listAgents } from "@/features/agents/data";
import { checkAccess } from "@/lib/auth/session";
import { describeActivity } from "@/features/shared/activity";
import { parseRange } from "@/features/shared/range";
import { MetricBarChart, MetricChart } from "@/features/shared/metric-chart";
import { ACTIVE_AGENT_STATUSES, AGENT_STATUS, TASK_PRIORITY } from "@/features/shared/status";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { getChart } from "@/features/discover/data";
import { revenueChart } from "@/features/games/payouts-compute";
import type { Messages } from "@/i18n/messages";
import { getI18n, getLocale, getT } from "@/i18n/server";
import { getRecentActivity, getStudioCounts, getUpcomingTasks } from "./live";
import { getStudioMetrics } from "./studio";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function rangeFrom(searchParams: SearchParams) {
  return parseRange((await searchParams).range, await getLocale());
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
  const [studio, counts, { t, f }, agentAccess] = await Promise.all([
    getStudioMetrics(range.key, today, await getLocale()),
    getStudioCounts(today),
    getI18n(),
    checkAccess("admin"),
  ]);
  const k = t.overview.kpis;
  // Agents are visible to Owner and Admin only (RLS): others see a dash, not a false zero.
  const agents = agentAccess.status === "allowed" ? await listAgents() : null;
  const activeAgents = agents ? agents.filter((a) => ACTIVE_AGENT_STATUSES.includes(a.status)).length : null;
  const unavailable = k.unavailable;
  const comparison = range.granularity === "month" ? undefined : range.comparison;

  const ok = studio.status === "ok";
  const hasAnalytics = ok && studio.analyticsCount > 0;
  const coverage = ok ? k.coverage(studio.analyticsCount, studio.gameCount) : "";
  const noData = studio.status === "no_games" ? k.noGames : studio.status === "error" ? unavailable : k.notAuthorized;
  const revenueDelta = hasAnalytics ? delta(studio.revenue.total, studio.revenue.previous) : undefined;
  const visits = hasAnalytics ? studio.perGame.reduce((sum, g) => sum + g.visits, 0) : null;

  const figures: SummaryFigure[] = [
    {
      label: k.usd,
      value: hasAnalytics ? f.formatCurrency(studio.revenue.total * studio.devexRate) : "—",
      info: k.usdInfo,
      hint: hasAnalytics ? k.usdHint : noData,
      icon: DollarSign,
      tone: "green",
    },
    {
      label: k.totalCcu,
      value: ok && studio.playingNow !== null ? f.formatNumber(studio.playingNow) : "—",
      info: k.ccuInfo,
      hint: ok ? (studio.playingNow === null ? k.robloxUnreachable : k.playersOnline(studio.gameCount)) : noData,
      icon: Users,
      tone: "aqua",
    },
    {
      label: k.totalDau,
      value: hasAnalytics && studio.dau.average !== null ? f.formatNumber(Math.round(studio.dau.average)) : "—",
      info: k.dauInfo,
      hint: hasAnalytics ? k.dailyAverage(coverage) : noData,
      icon: Activity,
      tone: "violet",
    },
    {
      label: k.visits,
      value: visits !== null ? f.formatNumber(visits) : "—",
      info: k.visitsInfo,
      hint: hasAnalytics ? k.visitsHint(coverage) : noData,
      icon: MousePointerClick,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-4">
      <SummaryPanel
        title={k.summaryTitle}
        description={k.summaryDescription(range.label)}
        info={k.summaryInfo}
        hero={{
          label: k.totalRevenue,
          value: hasAnalytics ? f.formatRobux(studio.revenue.total) : "—",
          info: k.revenueInfo,
          icon: Coins,
          delta: revenueDelta,
          deltaLabel: comparison,
          hint: hasAnalytics ? (studio.revenue.rewards > 0 ? k.includingRewards(f.formatRobux(studio.revenue.rewards)) : coverage) : noData,
        }}
        figures={figures}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={k.activeGames}
          value={counts.games ? f.formatNumber(counts.games.live) : "—"}
          source="live"
          icon={Gamepad2}
          tone="blue"
          info={k.activeGamesInfo}
          hint={!counts.games ? unavailable : counts.games.total === 0 ? k.noGamesYet : k.trackedTotal(counts.games.total)}
        />
        <StatCard
          label={k.activeProjects}
          value={counts.projects ? f.formatNumber(counts.projects.active) : "—"}
          source="live"
          icon={FolderKanban}
          tone="violet"
          info={k.activeProjectsInfo}
          hint={!counts.projects ? unavailable : counts.projects.active === 0 ? k.noActiveProject : k.activeProjectsHint}
        />
        <StatCard
          label={k.activeAgents}
          value={activeAgents === null ? "—" : f.formatNumber(activeAgents)}
          source="live"
          icon={Bot}
          tone="aqua"
          info={k.activeAgentsInfo}
          hint={agentAccess.status !== "allowed" ? k.agentsAdminOnly : agents ? k.agentsTotal(agents.length) : unavailable}
        />
        <StatCard
          label={k.pendingTasks}
          value={counts.tasks ? f.formatNumber(counts.tasks.pending) : "—"}
          source="live"
          icon={ListTodo}
          tone="amber"
          info={k.pendingTasksInfo}
          hint={
            !counts.tasks
              ? unavailable
              : counts.tasks.overdue > 0
                ? k.overdue(counts.tasks.overdue)
                : counts.tasks.pending === 0
                  ? k.nothingWaiting
                  : k.noneOverdue
          }
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────── Charts ─────────────────────────────── */

export async function OverviewCharts({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  const studio = await getStudioMetrics(range.key, await todayIso(), await getLocale());
  const { t, f } = await getI18n();
  const c = t.overview.charts;

  if (studio.status !== "ok" || studio.analyticsCount === 0) {
    return (
      <Card>
        <EmptyState
          icon={studio.status === "ok" ? KeyRound : Gamepad2}
          title={studio.status === "no_games" ? c.noGamesTitle : studio.status === "error" ? c.errorTitle : c.noAnalyticsTitle}
          description={
            studio.status === "no_games"
              ? c.noGamesDescription
              : studio.status === "error"
                ? c.errorDescription
                : c.noAnalyticsDescription
          }
          action={
            <Link href="/games" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {c.goToGames}
            </Link>
          }
        />
      </Card>
    );
  }

  const rows = (key: string, points: { date: string; value: number }[]) => points.map((p) => ({ date: p.date, [key]: p.value }));
  const common = { source: "live" as const, granularity: range.granularity };
  const coverage = t.overview.kpis.coverage(studio.analyticsCount, studio.gameCount);
  const granularity = t.common.granularity[range.granularity];
  // Revenue as bars, one per day or month (sales and Roblox rewards stacked).
  const revenue = revenueChart(studio.revenue.salesSeries, studio.revenue.rewardsSeries, t.games.revenueChart);
  const revenueBars = revenue.rows.map(({ date, ...values }) => ({
    category: range.granularity === "month" ? f.formatMonth(date) : f.formatShortDate(date),
    ...values,
  }));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MetricBarChart
          className="xl:col-span-2"
          title={c.revenueTitle}
          info={c.revenueInfo}
          description={c.revenueDescription(granularity, range.label, coverage)}
          label={c.revenueLabel(granularity, range.label)}
          format="robux"
          rows={revenueBars}
          series={revenue.series}
          stacked
          timeAxis
          categoryLabel={t.common.chart.date}
          source="live"
        />
        <MetricChart
          title={c.ccuTitle}
          info={c.ccuInfo}
          description={c.ccuDescription(coverage)}
          label={c.ccuLabel}
          format="compact"
          variant="line"
          rows={rows("ccu", studio.peakCcu)}
          series={[{ key: "ccu", label: c.peakPlayers }]}
          {...common}
        />
        <MetricBarChart
          title={c.performanceTitle}
          info={c.performanceInfo}
          description={c.performanceDescription(range.label)}
          label={c.performanceDescription(range.label)}
          format="compact"
          rows={[...studio.perGame].sort((a, b) => b.visits - a.visits)}
          series={[{ key: "visits", label: c.visits }]}
          source="live"
        />
        <MetricChart
          className="xl:col-span-2"
          title={c.growthTitle}
          info={c.growthInfo}
          description={c.growthDescription(range.label, coverage)}
          label={c.growthLabel(range.label)}
          format="compact"
          rows={rows("visits", studio.growth)}
          series={[{ key: "visits", label: c.lifetimeVisits }]}
          {...common}
        />
      </div>
      {studio.unauthorized.length > 0 ? (
        <p className="text-[11px] text-fg-3">{c.notIncluded(studio.unauthorized.map((g) => g.name).join(", "))}</p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────── Lists ─────────────────────────────── */

async function ListCard({
  title,
  description,
  info,
  source,
  href,
  children,
}: {
  title: string;
  description?: string;
  info?: string;
  source: DataSource;
  href?: string;
  children: ReactNode;
}) {
  const t = await getT();
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        description={description}
        info={info}
        actions={
          <>
            <SourceBadge source={source} />
            {href ? (
              <Link href={href} className="text-xs font-medium text-accent-ink transition-colors hover:text-fg">
                {t.common.actions.viewAll}
              </Link>
            ) : null}
          </>
        }
      />
      <div className="flex-1 px-2 pb-2 pt-2">{children}</div>
    </Card>
  );
}

function dueLabel(due: string, today: string, labels: Messages["overview"]["tasks"]): { text: string; overdue: boolean } {
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { text: labels.overdueBy(-days), overdue: true };
  if (days === 0) return { text: labels.today, overdue: false };
  if (days === 1) return { text: labels.tomorrow, overdue: false };
  return { text: labels.inDays(days), overdue: false };
}

export async function UpcomingTasks() {
  const tasks = await getUpcomingTasks();
  const today = await todayIso();
  const t = await getT();
  const l = t.overview.tasks;

  return (
    <ListCard title={l.title} description={l.description} info={l.info} source="live" href="/tasks">
      {tasks === null ? (
        <ErrorState compact description={l.error} />
      ) : tasks.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title={l.emptyTitle} description={l.emptyDescription} />
      ) : (
        <ul>
          {tasks.map((task) => {
            const due = task.dueDate ? dueLabel(task.dueDate, today, l) : null;
            const priority = TASK_PRIORITY[task.priority];
            return (
              <li key={task.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
                <Badge tone={priority.tone} dot className="w-[4.5rem] justify-center">
                  {t.common.status.priority[task.priority]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{task.title}</p>
                  <p className="truncate text-xs text-fg-3">
                    {[task.project, task.assignee ?? l.unassigned, t.common.status.task[task.status]].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={cn("shrink-0 text-xs tabular", due?.overdue ? "font-medium text-critical" : "text-fg-3")}>
                  {due?.text ?? l.noDate}
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
  const { t, f } = await getI18n();
  const l = t.overview.activity;

  return (
    <ListCard title={l.title} description={l.description} info={l.info} source="live">
      {activity === null ? (
        <ErrorState compact description={l.error} />
      ) : activity.length === 0 ? (
        <EmptyState compact icon={Activity} title={l.emptyTitle} description={l.emptyDescription} />
      ) : (
        <ol className="space-y-0.5">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-3 rounded-md px-3 py-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-4" aria-hidden />
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg-2">
                {/* No actor = done by the system (server-side job or setup script). */}
                <span className="font-medium text-fg">{entry.actor ?? t.common.activity.system}</span> {describeActivity(entry, t)}
              </p>
              <time dateTime={entry.createdAt} className="shrink-0 text-xs text-fg-3">
                {f.formatRelative(entry.createdAt, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </ListCard>
  );
}

/** Live: Claude Code agents at work (Owner and Admin). */
export async function ActiveAgents() {
  await connection();
  const now = new Date();
  const [{ t, f }, access] = await Promise.all([getI18n(), checkAccess("admin")]);
  const a = t.overview.agents;
  const agents = access.status === "allowed" ? await listAgents(20) : null;
  const active = (agents ?? []).filter((agent) => ACTIVE_AGENT_STATUSES.includes(agent.status)).slice(0, 5);
  return (
    <ListCard title={a.title} description={a.description} info={a.info} source="live" href="/agents">
      {access.status !== "allowed" ? (
        <EmptyState compact title={a.adminOnly} />
      ) : !agents ? (
        <ErrorState compact title={t.agents.page.errorTitle} description={t.agents.page.errorDescription} />
      ) : active.length === 0 ? (
        <EmptyState compact title={a.empty} />
      ) : (
        <ul>
          {active.map((agent) => {
            const status = AGENT_STATUS[agent.status];
            const label = statusLabel(agent, t);
            return (
              <li key={agent.id}>
                <Link href={`/agents/${agent.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2/60">
                  <StatusDot tone={status.tone} pulse={status.pulse} label={label} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-fg">{agent.name}</p>
                    <p className="truncate text-xs text-fg-3">{agent.mission ?? t.agents.origin[agent.origin]}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={status.tone}>{label}</Badge>
                    {agent.lastActivityAt ? <p className="mt-1 text-[11px] text-fg-3">{f.formatRelative(agent.lastActivityAt, now)}</p> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ListCard>
  );
}

/** Live: the top of Roblox's Up-and-Coming chart. */
export async function MarketHighlights() {
  const chart = await getChart("up-and-coming", await todayIso());
  const { t, f } = await getI18n();
  const m = t.overview.market;

  return (
    <ListCard title={m.title} description={m.description} info={m.info} source="live" href="/discover?chart=up-and-coming">
      {chart.status !== "ok" ? (
        <ErrorState compact title={m.errorTitle} description={m.errorDescription} />
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
                    <p className="text-xs text-fg-3">{m.playing(f.formatCompact(game.playerCount))}</p>
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
                        {f.formatDelta(change)}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="px-3 pb-1 pt-2 text-[11px] text-fg-3">
            {chart.hasHistory ? m.changeSinceYesterday : m.changeAfterSnapshot}
          </p>
        </>
      )}
    </ListCard>
  );
}

const ALERT_STYLE = {
  critical: { icon: CircleExclamationPoint, tone: "critical" as const, box: "border-critical/25 bg-critical/10 text-critical" },
  warning: { icon: TriangleExclamationPoint, tone: "warning" as const, box: "border-warning/25 bg-warning/10 text-warning" },
  info: { icon: Info, tone: "info" as const, box: "border-info/25 bg-info/10 text-info" },
};

type AlertItem = { id: string; severity: keyof typeof ALERT_STYLE; title: string; detail: string; href: string };

export async function ImportantAlerts({ searchParams }: { searchParams: SearchParams }) {
  const range = await rangeFrom(searchParams);
  const studio = await getStudioMetrics(range.key, await todayIso(), await getLocale());
  const t = await getT();
  const a = t.overview.alerts;

  const items: AlertItem[] = [];
  if (studio.status === "ok") {
    if (!studio.robloxReachable) {
      items.push({ id: "roblox", severity: "warning", title: a.robloxUnreachableTitle, detail: a.robloxUnreachableDetail, href: "/games" });
    }
    for (const alert of studio.alerts) items.push({ ...alert, href: "/games" });
    for (const game of studio.unauthorized) {
      items.push({
        id: `auth-${game.id}`,
        severity: "info",
        title: a.notAuthorizedTitle,
        detail: a.notAuthorizedDetail(game.name),
        href: `/games/${game.id}`,
      });
    }
  }
  const order = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <ListCard title={a.title} description={a.description(range.label)} info={a.info} source="live">
      {studio.status === "error" ? (
        <ErrorState compact description={a.error} />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          icon={ShieldCheck}
          title={a.emptyTitle}
          description={studio.status === "no_games" ? a.emptyNoGames : a.emptyNormal}
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
                    {a.severity[alert.severity]}
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
