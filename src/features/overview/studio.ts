import "server-only";
import { cache } from "react";
import { computeGameAlerts, type GameAlert } from "@/features/games/alerts";
import { analyticsWindow, getGameAnalytics, sumOf, type GameAnalytics } from "@/features/games/analytics";
import { getDevexRate, listGames } from "@/features/games/data";
import { listPayouts } from "@/features/games/payouts";
import { addSeries, payoutSeries } from "@/features/games/payouts-compute";
import { parseRange } from "@/features/shared/range";
import type { DailyPoint } from "@/lib/integrations/roblox/analytics";
import { getRobloxGames } from "@/lib/integrations/roblox/public";

/*
 * LIVE studio-wide game metrics for the Overview: public Roblox stats for
 * every game, plus Roblox Analytics for the games the API key can read.
 * Every figure says how many games it covers, so a partial total is never
 * presented as complete.
 */

function sumByDate(seriesList: DailyPoint[][]): DailyPoint[] {
  const totals = new Map<string, number>();
  for (const series of seriesList) for (const p of series) totals.set(p.date, (totals.get(p.date) ?? 0) + p.value);
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

const avg = (points: DailyPoint[]) => (points.length ? sumOf(points) / points.length : null);

export type StudioMetrics = Awaited<ReturnType<typeof loadStudioMetrics>>;

async function loadStudioMetrics(rangeKey: string, today: string) {
  const range = parseRange(rangeKey);
  const games = await listGames();
  if (games === null) return { status: "error" as const };
  const tracked = games.filter((g) => g.status !== "archived");
  if (tracked.length === 0) return { status: "no_games" as const };

  const [roblox, devexRate, analyticsList, payouts] = await Promise.all([
    getRobloxGames(tracked.map((g) => g.universe_id)),
    getDevexRate(),
    Promise.all(tracked.map((g) => getGameAnalytics(g.universe_id, range, today, "overview"))),
    listPayouts(tracked.map((g) => g.id)),
  ]);

  const withAnalytics = tracked
    .map((game, i) => ({ game, analytics: analyticsList[i] as GameAnalytics }))
    .filter((entry) => entry.analytics.status === "ok");
  const unauthorized = tracked.filter((_, i) => analyticsList[i]?.status === "unauthorized");

  const pick = (key: "revenue" | "dau" | "visits" | "peakCcu", period: "current" | "previous") =>
    sumByDate(withAnalytics.map((e) => e.analytics[key][period]));

  // Revenue = game sales (Roblox Analytics) + Creator Rewards and Roblox Plus
  // (recorded monthly, spread over the days — an estimate).
  const sales = pick("revenue", "current");
  const salesPrevious = pick("revenue", "previous");
  const rewards = payoutSeries(payouts, analyticsWindow(range, today), range.granularity, today);
  const dau = pick("dau", "current");
  const dauPrevious = pick("dau", "previous");
  const visits = pick("visits", "current");

  // Studio growth: cumulative lifetime visits of the games with analytics.
  const lifetime = withAnalytics.reduce((acc, e) => acc + (roblox?.get(e.game.universe_id)?.visits ?? 0), 0);
  let running = lifetime - sumOf(visits);
  const growth = visits.map((p) => ({ date: p.date, value: (running += p.value) }));

  const alerts: GameAlert[] = withAnalytics.flatMap((e) =>
    computeGameAlerts({ gameName: e.game.name, dau: e.analytics.dau, revenue: e.analytics.revenue, d1: e.analytics.d1 }),
  );

  return {
    status: "ok" as const,
    range,
    devexRate,
    gameCount: tracked.length,
    analyticsCount: withAnalytics.length,
    unauthorized: unauthorized.map((g) => ({ id: g.id, name: g.name })),
    robloxReachable: roblox !== null,
    playingNow: roblox ? tracked.reduce((acc, g) => acc + (roblox.get(g.universe_id)?.playing ?? 0), 0) : null,
    revenue: {
      total: sumOf(sales) + sumOf(rewards.current),
      sales: sumOf(sales),
      rewards: sumOf(rewards.current),
      previous: salesPrevious.length ? sumOf(salesPrevious) + sumOf(rewards.previous) : null,
      /** Sales + rewards per day (or month). */
      series: addSeries(sales, rewards.current),
      salesSeries: sales,
      rewardsSeries: rewards.current,
    },
    dau: { average: avg(dau), previous: avg(dauPrevious), series: dau },
    peakCcu: pick("peakCcu", "current"),
    growth,
    perGame: withAnalytics.map((e) => ({ category: e.game.name, visits: sumOf(e.analytics.visits.current) })),
    alerts,
  };
}

/** Memoized per request: KPIs, charts and alerts share one computation. */
export const getStudioMetrics = cache(loadStudioMetrics);
