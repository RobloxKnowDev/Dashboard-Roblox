import {
  Activity,
  ArrowLeft,
  CircleExclamationPoint,
  Clock,
  Coins,
  ExternalLink,
  Info,
  KeyRound,
  Repeat,
  ShieldCheck,
  TriangleExclamationPoint,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StatCard } from "@/components/data/stat-card";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { parseRange, type RangeConfig } from "@/features/shared/range";
import { MetricChart } from "@/features/shared/metric-chart";
import { GAME_STATUS } from "@/features/shared/status";
import { checkAccess } from "@/lib/auth/session";
import type { DailyPoint } from "@/lib/integrations/roblox/analytics";
import { getRobloxGames, likeRatio, robloxGameUrl } from "@/lib/integrations/roblox/public";
import { cn } from "@/lib/utils/cn";
import { formatCompact, formatCurrency, formatDate, formatMonthYear, formatNumber, formatPercent, formatRobux } from "@/lib/utils/format";
import { GameStatusSelect, RemoveGameButton } from "./admin-controls";
import { computeGameAlerts } from "./alerts";
import { analyticsWindow, avgOf, deltaOf, getGameAnalytics, sumOf, type GameAnalytics } from "./analytics";
import { GameIcon } from "./components";
import { getDevexRate, getGame, type GameRow } from "./data";
import { listPayouts } from "./payouts";
import { EditPayoutButton, PayoutFormModal } from "./payout-form";
import { PAYOUT_SOURCES, payoutSeries, recentMonths, revenueChart, type PayoutSource } from "./payouts-compute";

type Params = Promise<{ gameId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads the game or 404s. getGame is memoized per request. */
async function loadGame(params: Params): Promise<GameRow> {
  const { gameId } = await params;
  if (!UUID.test(gameId)) notFound();
  const game = await getGame(gameId);
  if (game === undefined) notFound();
  if (game === null) throw new Error("The game couldn't be loaded.");
  return game;
}

/* ───────────────────────────── Header ───────────────────────────── */

export async function GameHeader({ params }: { params: Params }) {
  const game = await loadGame(params);
  const [roblox, access] = await Promise.all([getRobloxGames([game.universe_id]), checkAccess("admin")]);
  const info = roblox?.get(game.universe_id);
  const status = GAME_STATUS[game.status];
  const isAdmin = access.status === "allowed";

  return (
    <div className="space-y-5">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" aria-hidden />
        My Games
      </Link>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <GameIcon src={info?.iconUrl ?? game.thumbnail_url} name={game.name} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">{info?.name ?? game.name}</h1>
              {!isAdmin ? (
                <Badge tone={status.tone} dot>
                  {status.label}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-fg-3">
              {[info?.genre ?? game.genre, info ? `Updated ${formatDate(info.updated)}` : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">
              Universe {game.universe_id}
              {game.place_id ? ` · Place ${game.place_id}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin ? <GameStatusSelect gameId={game.id} status={game.status} /> : null}
          {game.place_id ? (
            <a
              href={robloxGameUrl(game.place_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors hover:bg-surface-3"
            >
              Open on Roblox
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          {isAdmin ? <RemoveGameButton gameId={game.id} name={info?.name ?? game.name} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Live stats ─────────────────────────── */

export async function GameLiveStats({ params }: { params: Params }) {
  const game = await loadGame(params);
  const roblox = await getRobloxGames([game.universe_id]);
  const info = roblox?.get(game.universe_id);
  if (!info) {
    return <ErrorState compact title="Live stats unavailable" description="Roblox couldn't be reached. Refresh in a moment." />;
  }
  const rating = likeRatio(info);

  const items = [
    { label: "Playing now", value: formatNumber(info.playing), hint: `Up to ${info.maxPlayers} per server` },
    { label: "Total visits", value: formatCompact(info.visits), hint: `Since ${formatDate(info.created)}` },
    { label: "Favorites", value: formatCompact(info.favorites), hint: `${formatNumber(info.favorites)} players` },
    {
      label: "Rating",
      value: rating === null ? "—" : formatPercent(rating),
      hint: `${formatCompact(info.upVotes ?? 0)} likes · ${formatCompact(info.downVotes ?? 0)} dislikes`,
    },
  ];

  return (
    <section aria-label="Live stats" className="space-y-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} source="live" hint={item.hint} />
        ))}
      </div>
      <p className="text-[11px] text-fg-3">Live from Roblox · refreshed every minute.</p>
    </section>
  );
}

/* ─────────────────────────── Analytics ─────────────────────────── */

function rowsOf(series: Record<string, DailyPoint[]>) {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const [key, points] of Object.entries(series)) {
    for (const p of points) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[key] = p.value;
      byDate.set(p.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))) as ({ date: string } & Record<string, number | string>)[];
}

function AnalyticsUnavailable({ status, universeId }: { status: GameAnalytics["status"]; universeId: number }) {
  if (status === "unauthorized") {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed text-fg-2">
            <p className="text-sm font-medium text-fg">Analytics aren&apos;t authorized for this game yet</p>
            <p>
              Your Roblox API key can read analytics for other experiences, but not this one (Universe{" "}
              <span className="font-mono">{universeId}</span>). To fix it:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-fg-3">
              <li>Open Creator Hub → API Keys and edit the key used by the dashboard.</li>
              <li>
                Under Access Permissions → <span className="font-mono text-fg-2">universe-analytics</span>, add this experience with the{" "}
                <span className="font-mono text-fg-2">universe.analytics:read</span> operation.
              </li>
              <li>If the game belongs to a group, your role in that group must allow it.</li>
              <li>
                Games from another group or account can use their own key: add it to the server environment as{" "}
                <span className="font-mono text-fg-2">ROBLOX_OPEN_CLOUD_API_KEY_2</span> (up to _5). Each game automatically uses the key that works.
              </li>
            </ol>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <ErrorState
      title={status === "not_configured" ? "Analytics key not configured" : "Analytics unavailable right now"}
      description={
        status === "not_configured"
          ? "Add ROBLOX_OPEN_CLOUD_API_KEY to the server environment to see DAU, revenue and retention."
          : "Roblox's analytics service didn't answer. This usually resolves itself — try again later."
      }
    />
  );
}

const ALERT_STYLE = {
  critical: { icon: CircleExclamationPoint, tone: "critical" as const, label: "Critical", box: "border-critical/25 bg-critical/10 text-critical" },
  warning: { icon: TriangleExclamationPoint, tone: "warning" as const, label: "Warning", box: "border-warning/25 bg-warning/10 text-warning" },
  info: { icon: Info, tone: "info" as const, label: "Info", box: "border-info/25 bg-info/10 text-info" },
};

function revenueHint(robux: number, rate: number) {
  return `≈ ${formatCurrency(robux * rate)} at the DevEx rate`;
}

export async function GameAnalyticsSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const range: RangeConfig = parseRange((await searchParams).range);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const [analytics, devexRate, payouts] = await Promise.all([getGameAnalytics(game.universe_id, range, today), getDevexRate(), listPayouts([game.id])]);

  if (analytics.status !== "ok") return <AnalyticsUnavailable status={analytics.status} universeId={game.universe_id} />;

  const dauNow = avgOf(analytics.dau.current);
  // Revenue = game sales (Roblox Analytics) + Creator Rewards and Roblox Plus (recorded monthly, spread over the days).
  const rewards = payoutSeries(payouts, analyticsWindow(range, today), range.granularity, today);
  const rewardsNow = sumOf(rewards.current);
  const revenueNow = sumOf(analytics.revenue.current) + rewardsNow;
  const revenuePrevious = analytics.revenue.previous.length ? sumOf(analytics.revenue.previous) + sumOf(rewards.previous) : null;
  const d1Now = avgOf(analytics.d1.current);
  const sessionNow = avgOf(analytics.session.current);
  const comparison = range.granularity === "month" ? undefined : range.comparison;
  const common = { source: "live" as const, granularity: range.granularity };
  const alerts = computeGameAlerts({ gameName: game.name, dau: analytics.dau, revenue: analytics.revenue, d1: analytics.d1 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Daily active users"
          value={dauNow === null ? "—" : formatNumber(Math.round(dauNow))}
          source="live"
          icon={Activity}
          delta={deltaOf(dauNow, avgOf(analytics.dau.previous))}
          deltaLabel={comparison}
          hint={`Daily average, ${range.label}`}
        />
        <StatCard
          label="Revenue"
          value={formatRobux(revenueNow)}
          source="live"
          icon={Coins}
          delta={deltaOf(revenueNow, revenuePrevious)}
          deltaLabel={comparison}
          hint={rewardsNow > 0 ? `≈ ${formatCurrency(revenueNow * devexRate)} · incl. ${formatRobux(rewardsNow)} rewards` : revenueHint(revenueNow, devexRate)}
        />
        <StatCard
          label="Day-1 retention"
          value={d1Now === null ? "—" : formatPercent(d1Now)}
          source="live"
          icon={Repeat}
          delta={deltaOf(d1Now, avgOf(analytics.d1.previous))}
          deltaLabel={comparison}
          hint="Share of new players back the next day"
        />
        <StatCard
          label="Average session"
          value={sessionNow === null ? "—" : `${sessionNow.toFixed(1)} min`}
          source="live"
          icon={Clock}
          delta={deltaOf(sessionNow, avgOf(analytics.session.previous))}
          deltaLabel={comparison}
          hint={`Per session, ${range.label}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MetricChart
          title="Player activity"
          description={`Daily active users, ${range.label}`}
          label={`Daily active users, ${range.label}`}
          format="compact"
          variant="line"
          rows={rowsOf({ dau: analytics.dau.current })}
          series={[{ key: "dau", label: "Daily active users" }]}
          {...common}
        />
        <MetricChart
          title="Revenue"
          description={`Robux earned per ${range.granularity}, ${range.label}`}
          label={`Robux earned per ${range.granularity}, ${range.label}: game sales and rewards`}
          format="robux"
          {...revenueChart(analytics.revenue.current, rewards.current)}
          {...common}
        />
        <MetricChart
          title="Retention"
          description="Share of new players coming back after 1, 7 and 30 days"
          label={`Day 1, 7 and 30 retention, ${range.label}`}
          format="percent"
          variant="line"
          rows={rowsOf({ d1: analytics.d1.current, d7: analytics.d7.current, d30: analytics.d30.current })}
          series={[
            { key: "d1", label: "Day 1" },
            { key: "d7", label: "Day 7" },
            { key: "d30", label: "Day 30" },
          ]}
          emptyMessage="Retention needs a few days of new players before Roblox can report it."
          {...common}
        />
        <MetricChart
          title="Performance history"
          description={`Visits per ${range.granularity}, ${range.label}`}
          label={`Visits per ${range.granularity}, ${range.label}`}
          format="compact"
          rows={rowsOf({ visits: analytics.visits.current })}
          series={[{ key: "visits", label: "Visits" }]}
          {...common}
        />
        <MetricChart
          title="Peak concurrent players"
          description="Daily peak — Roblox keeps this metric for 28 days"
          label="Daily peak concurrent players over the last 28 days at most"
          format="compact"
          variant="line"
          rows={rowsOf({ peak: analytics.peakCcu.current })}
          series={[{ key: "peak", label: "Peak players" }]}
          {...common}
        />
        <Card className="flex flex-col">
          <CardHeader title="Alerts" description="Computed from this game's analytics" actions={<SourceBadge source="live" />} />
          <div className="flex-1 px-2 pb-2 pt-2">
            {alerts.length === 0 ? (
              <EmptyState compact icon={ShieldCheck} title="No alerts" description="Retention, players and revenue are within normal ranges for this period." />
            ) : (
              <ul className="space-y-1">
                {alerts.map((alert) => {
                  const style = ALERT_STYLE[alert.severity];
                  const Icon = style.icon;
                  return (
                    <li key={alert.id} className="flex gap-3 rounded-md px-3 py-2.5">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", style.box)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-fg">{alert.title}</p>
                        <p className="text-xs text-fg-3">{alert.detail}</p>
                      </div>
                      <Badge tone={style.tone} className="self-start">
                        {style.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
      <p className="text-[11px] text-fg-3">Roblox Analytics · daily values, about one day behind, refreshed hourly.</p>
    </div>
  );
}

/* ─────────────────────── Creator Rewards & Roblox Plus ─────────────────────── */

export async function GamePayoutsSection({ params }: { params: Params }) {
  const game = await loadGame(params);
  const [payouts, access, devexRate] = await Promise.all([listPayouts([game.id]), checkAccess("admin"), getDevexRate()]);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = access.status === "allowed";

  // Last 12 months, plus any older month that has payouts.
  const months = [...new Set([...recentMonths(today), ...payouts.map((p) => p.month)])].sort().reverse();
  const valueOf = (month: string, source: PayoutSource) => payouts.find((p) => p.month === month && p.source === source)?.robux ?? null;
  const total = payouts.reduce((acc, p) => acc + p.robux, 0);
  const monthLabel = (month: string) => formatMonthYear(month);

  return (
    <Card>
      <CardHeader
        title="Creator Rewards & Roblox Plus"
        description="Robux Roblox pays on top of game sales. They have no API: record them each month from the Creator Hub."
        actions={isAdmin ? <PayoutFormModal gameId={game.id} gameName={game.name} /> : null}
      />
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">Monthly Creator Rewards and Roblox Plus payouts</caption>
          <THead>
            <TR>
              <TH>Month</TH>
              {PAYOUT_SOURCES.map((s) => (
                <TH key={s.key} className="text-right">
                  {s.label}
                </TH>
              ))}
              <TH className="text-right">Total</TH>
              {isAdmin ? (
                <TH className="w-12">
                  <span className="sr-only">Edit</span>
                </TH>
              ) : null}
            </TR>
          </THead>
          <TBody>
            {months.map((month) => {
              const values = PAYOUT_SOURCES.map((s) => valueOf(month, s.key));
              const sum = values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
              const recorded = values.some((v) => v !== null);
              return (
                <TR key={month}>
                  <TD className="whitespace-nowrap text-fg-2">
                    {monthLabel(month)}
                    {month.slice(0, 7) === today.slice(0, 7) ? <span className="ml-1.5 text-xs text-fg-3">(so far)</span> : null}
                  </TD>
                  {values.map((v, i) => (
                    <TD key={PAYOUT_SOURCES[i]?.key} className="text-right tabular">
                      {v === null ? <span className="text-fg-4">—</span> : formatRobux(v)}
                    </TD>
                  ))}
                  <TD className="text-right font-medium tabular text-fg">{recorded ? formatRobux(sum) : <span className="font-normal text-fg-4">—</span>}</TD>
                  {isAdmin ? (
                    <TD className="text-right">
                      <EditPayoutButton
                        gameId={game.id}
                        gameName={game.name}
                        label={monthLabel(month)}
                        initial={{
                          month: month.slice(0, 7),
                          creatorRewards: values[0] === null || values[0] === undefined ? "" : String(values[0]),
                          robloxPlus: values[1] === null || values[1] === undefined ? "" : String(values[1]),
                        }}
                      />
                    </TD>
                  ) : null}
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-fg-3">
        {total > 0 ? `${formatRobux(total)} recorded in total (≈ ${formatCurrency(total * devexRate)} at the DevEx rate). ` : "Nothing recorded yet. "}
        Added to this game&apos;s revenue above and to the studio totals.
      </p>
    </Card>
  );
}
