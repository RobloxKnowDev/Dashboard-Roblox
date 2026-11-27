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
import { INTL_LOCALE } from "@/i18n/config";
import { getI18n, getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";
import { getRobloxGames, likeRatio, robloxGameUrl } from "@/lib/integrations/roblox/public";
import { cn } from "@/lib/utils/cn";
import { GameStatusSelect, RemoveGameButton } from "./admin-controls";
import { computeGameAlerts } from "./alerts";
import { analyticsWindow, avgOf, deltaOf, getGameAnalytics, sumOf, type GameAnalytics } from "./analytics";
import { GameIcon } from "./components";
import { getDevexRate, getGame, type GameRow } from "./data";
import { rowsOf } from "./rows";
import { listPayouts } from "./payouts";
import { EditPayoutButton, PayoutFormModal } from "./payout-form";
import { PAYOUT_SOURCES, payoutSeries, recentMonths, revenueChart, type PayoutSource } from "./payouts-compute";

export type Params = Promise<{ gameId: string }>;
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads the game or 404s. getGame is memoized per request. */
export async function loadGame(params: Params): Promise<GameRow> {
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
  const [roblox, access, { t, f }] = await Promise.all([getRobloxGames([game.universe_id]), checkAccess("admin"), getI18n()]);
  const info = roblox?.get(game.universe_id);
  const status = GAME_STATUS[game.status];
  const isAdmin = access.status === "allowed";

  return (
    <div className="space-y-5">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t.games.detail.back}
      </Link>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <GameIcon src={info?.iconUrl ?? game.thumbnail_url} name={game.name} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">{info?.name ?? game.name}</h1>
              {!isAdmin ? (
                <Badge tone={status.tone} dot>
                  {t.common.status.game[game.status]}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-fg-3">
              {[info?.genre ?? game.genre, info ? t.games.detail.updated(f.formatDate(info.updated)) : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">
              {t.games.detail.universe(String(game.universe_id))}
              {game.place_id ? t.games.detail.place(String(game.place_id)) : ""}
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
              {t.games.detail.openOnRoblox}
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
  const [roblox, { t, f }] = await Promise.all([getRobloxGames([game.universe_id]), getI18n()]);
  const info = roblox?.get(game.universe_id);
  if (!info) {
    return <ErrorState compact title={t.games.live.unavailableTitle} description={t.games.live.unavailableDescription} />;
  }
  const rating = likeRatio(info);

  const items = [
    { key: "playing", label: t.games.live.playingNow, value: f.formatNumber(info.playing), hint: t.games.live.playingHint(String(info.maxPlayers)) },
    { key: "visits", label: t.games.live.totalVisits, value: f.formatCompact(info.visits), hint: t.games.live.visitsHint(f.formatDate(info.created)) },
    { key: "favorites", label: t.games.live.favorites, value: f.formatCompact(info.favorites), hint: t.games.live.favoritesHint(f.formatNumber(info.favorites)) },
    {
      key: "rating",
      label: t.games.live.rating,
      value: rating === null ? "—" : f.formatPercent(rating),
      hint: t.games.live.ratingHint(f.formatCompact(info.upVotes ?? 0), f.formatCompact(info.downVotes ?? 0)),
    },
  ];

  return (
    <section aria-label={t.games.live.ariaLabel} className="space-y-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <StatCard key={item.key} label={item.label} value={item.value} source="live" hint={item.hint} />
        ))}
      </div>
      <p className="text-[11px] text-fg-3">{t.games.live.footnote}</p>
    </section>
  );
}

/* ─────────────────────────── Analytics ─────────────────────────── */

export async function AnalyticsUnavailable({ status, universeId }: { status: GameAnalytics["status"]; universeId: number }) {
  const t = await getT();
  const u = t.games.unavailable;
  if (status === "unauthorized") {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed text-fg-2">
            <p className="text-sm font-medium text-fg">{u.unauthorizedTitle}</p>
            <p>
              {u.unauthorizedIntroStart}
              <span className="font-mono">{universeId}</span>
              {u.unauthorizedIntroEnd}
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-fg-3">
              <li>{u.step1}</li>
              <li>
                {u.step2Start}
                <span className="font-mono text-fg-2">universe-analytics</span>
                {u.step2Middle}
                <span className="font-mono text-fg-2">universe.analytics:read</span>
                {u.step2End}
              </li>
              <li>{u.step3}</li>
              <li>
                {u.step4Start}
                <span className="font-mono text-fg-2">ROBLOX_OPEN_CLOUD_API_KEY_2</span>
                {u.step4End}
              </li>
            </ol>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <ErrorState
      title={status === "not_configured" ? u.notConfiguredTitle : u.errorTitle}
      description={status === "not_configured" ? u.notConfiguredDescription : u.errorDescription}
    />
  );
}

const ALERT_STYLE = {
  critical: { icon: CircleExclamationPoint, tone: "critical" as const, box: "border-critical/25 bg-critical/10 text-critical" },
  warning: { icon: TriangleExclamationPoint, tone: "warning" as const, box: "border-warning/25 bg-warning/10 text-warning" },
  info: { icon: Info, tone: "info" as const, box: "border-info/25 bg-info/10 text-info" },
};

export async function GameAnalyticsSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const { t, f, locale } = await getI18n();
  const range: RangeConfig = parseRange((await searchParams).range, locale);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const [analytics, devexRate, payouts] = await Promise.all([getGameAnalytics(game.universe_id, range, today), getDevexRate(), listPayouts([game.id])]);

  if (analytics.status !== "ok") return <AnalyticsUnavailable status={analytics.status} universeId={game.universe_id} />;

  const p = t.games.performance;
  const per = t.common.granularity[range.granularity];
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
  const alerts = computeGameAlerts({ gameName: game.name, dau: analytics.dau, revenue: analytics.revenue, d1: analytics.d1 }, t);
  const oneDecimal = (value: number) => value.toLocaleString(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={p.dau}
          value={dauNow === null ? "—" : f.formatNumber(Math.round(dauNow))}
          source="live"
          icon={Activity}
          delta={deltaOf(dauNow, avgOf(analytics.dau.previous))}
          deltaLabel={comparison}
          hint={p.dauHint(range.label)}
        />
        <StatCard
          label={p.revenue}
          value={f.formatRobux(revenueNow)}
          source="live"
          icon={Coins}
          delta={deltaOf(revenueNow, revenuePrevious)}
          deltaLabel={comparison}
          hint={
            rewardsNow > 0
              ? p.revenueHintRewards(f.formatCurrency(revenueNow * devexRate), f.formatRobux(rewardsNow))
              : p.revenueHint(f.formatCurrency(revenueNow * devexRate))
          }
        />
        <StatCard
          label={p.d1}
          value={d1Now === null ? "—" : f.formatPercent(d1Now)}
          source="live"
          icon={Repeat}
          delta={deltaOf(d1Now, avgOf(analytics.d1.previous))}
          deltaLabel={comparison}
          hint={p.d1Hint}
        />
        <StatCard
          label={p.session}
          value={sessionNow === null ? "—" : p.sessionValue(oneDecimal(sessionNow))}
          source="live"
          icon={Clock}
          delta={deltaOf(sessionNow, avgOf(analytics.session.previous))}
          deltaLabel={comparison}
          hint={p.sessionHint(range.label)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MetricChart
          title={p.activityTitle}
          description={p.activityDescription(range.label)}
          label={p.activityDescription(range.label)}
          format="compact"
          variant="line"
          rows={rowsOf({ dau: analytics.dau.current })}
          series={[{ key: "dau", label: p.dau }]}
          {...common}
        />
        <MetricChart
          title={p.revenueTitle}
          description={p.revenueDescription(per, range.label)}
          label={p.revenueLabel(per, range.label)}
          format="robux"
          {...revenueChart(analytics.revenue.current, rewards.current, t.games.revenueChart)}
          {...common}
        />
        <MetricChart
          title={p.retentionTitle}
          description={p.retentionDescription}
          label={p.retentionLabel(range.label)}
          format="percent"
          variant="line"
          rows={rowsOf({ d1: analytics.d1.current, d7: analytics.d7.current, d30: analytics.d30.current })}
          series={[
            { key: "d1", label: p.day1 },
            { key: "d7", label: p.day7 },
            { key: "d30", label: p.day30 },
          ]}
          emptyMessage={p.retentionEmpty}
          {...common}
        />
        <MetricChart
          title={p.historyTitle}
          description={p.historyDescription(per, range.label)}
          label={p.historyDescription(per, range.label)}
          format="compact"
          rows={rowsOf({ visits: analytics.visits.current })}
          series={[{ key: "visits", label: p.visits }]}
          {...common}
        />
        <MetricChart
          title={p.peakTitle}
          description={p.peakDescription}
          label={p.peakLabel}
          format="compact"
          variant="line"
          rows={rowsOf({ peak: analytics.peakCcu.current })}
          series={[{ key: "peak", label: p.peakSeries }]}
          {...common}
        />
        <Card className="flex flex-col">
          <CardHeader title={p.alertsTitle} description={p.alertsDescription} actions={<SourceBadge source="live" />} />
          <div className="flex-1 px-2 pb-2 pt-2">
            {alerts.length === 0 ? (
              <EmptyState compact icon={ShieldCheck} title={p.noAlertsTitle} description={p.noAlertsDescription} />
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
                        {p.severity[alert.severity]}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
      <p className="text-[11px] text-fg-3">{p.footnote}</p>
    </div>
  );
}

/* ─────────────────────── Creator Rewards & Roblox Plus ─────────────────────── */

export async function GamePayoutsSection({ params }: { params: Params }) {
  const game = await loadGame(params);
  const [payouts, access, devexRate, { t, f }] = await Promise.all([listPayouts([game.id]), checkAccess("admin"), getDevexRate(), getI18n()]);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = access.status === "allowed";
  const text = t.games.payouts;

  // Last 12 months, plus any older month that has payouts.
  const months = [...new Set([...recentMonths(today), ...payouts.map((p) => p.month)])].sort().reverse();
  const valueOf = (month: string, source: PayoutSource) => payouts.find((p) => p.month === month && p.source === source)?.robux ?? null;
  const total = payouts.reduce((acc, p) => acc + p.robux, 0);
  const monthLabel = (month: string) => f.formatMonthYear(month);

  return (
    <Card>
      <CardHeader
        title={text.title}
        description={text.description}
        actions={isAdmin ? <PayoutFormModal gameId={game.id} gameName={game.name} /> : null}
      />
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{text.caption}</caption>
          <THead>
            <TR>
              <TH>{text.month}</TH>
              {PAYOUT_SOURCES.map((s) => (
                <TH key={s.key} className="text-right">
                  {s.label}
                </TH>
              ))}
              <TH className="text-right">{text.total}</TH>
              {isAdmin ? (
                <TH className="w-12">
                  <span className="sr-only">{t.common.actions.edit}</span>
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
                    {month.slice(0, 7) === today.slice(0, 7) ? <span className="ml-1.5 text-xs text-fg-3">{text.soFar}</span> : null}
                  </TD>
                  {values.map((v, i) => (
                    <TD key={PAYOUT_SOURCES[i]?.key} className="text-right tabular">
                      {v === null ? <span className="text-fg-4">—</span> : f.formatRobux(v)}
                    </TD>
                  ))}
                  <TD className="text-right font-medium tabular text-fg">{recorded ? f.formatRobux(sum) : <span className="font-normal text-fg-4">—</span>}</TD>
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
        {total > 0 ? text.recordedTotal(f.formatRobux(total), f.formatCurrency(total * devexRate)) : text.nothingYet}
        {text.addedTo}
      </p>
    </Card>
  );
}
