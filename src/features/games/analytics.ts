import "server-only";
import { getDailyMetric, type AnalyticsMetric, type DailyPoint, type MetricResult } from "@/lib/integrations/roblox/analytics";
import type { RangeConfig } from "@/features/shared/range";

/** Roblox keeps PeakConcurrentPlayers for 28 days only. */
const PEAK_CCU_RETENTION_DAYS = 27;

export type AnalyticsStatus = "ok" | "unauthorized" | "not_configured" | "error";

export type MetricSeries = {
  /** Points of the selected period (monthly buckets for the 12-month range). */
  current: DailyPoint[];
  /** Equal-length period just before (empty for 12 months). */
  previous: DailyPoint[];
};

export type GameAnalytics = {
  status: AnalyticsStatus;
  dau: MetricSeries;
  revenue: MetricSeries;
  visits: MetricSeries;
  peakCcu: MetricSeries;
  session: MetricSeries;
  d1: MetricSeries;
  d7: MetricSeries;
  d30: MetricSeries;
};

const EMPTY: MetricSeries = { current: [], previous: [] };

function addDays(isoDay: string, days: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar window for a range, ending today (exclusive — today isn't complete). */
export function analyticsWindow(range: RangeConfig, today: string) {
  const end = today;
  const mid = addDays(end, -range.days);
  // No comparison period for 12 months (keeps queries within budget).
  const start = range.granularity === "month" ? mid : addDays(mid, -range.days);
  return { start, mid, end };
}

/** One status for a set of queries: usable as soon as one of them answered. */
export function overallStatus(results: { status: string }[]): AnalyticsStatus {
  if (results.some((r) => r.status === "ok")) return "ok";
  if (results.length > 0 && results.every((r) => r.status === "unauthorized")) return "unauthorized";
  if (results.some((r) => r.status === "not_configured")) return "not_configured";
  return "error";
}

export const sumOf = (points: DailyPoint[]) => points.reduce((acc, p) => acc + p.value, 0);
export const avgOf = (points: DailyPoint[]) => (points.length ? sumOf(points) / points.length : null);
export const lastOf = (points: DailyPoint[]) => (points.length ? (points[points.length - 1]?.value ?? null) : null);

/** Relative change, or undefined when there's nothing to compare with. */
export function deltaOf(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return current / previous - 1;
}

function monthly(points: DailyPoint[], mode: "sum" | "avg"): DailyPoint[] {
  const buckets = new Map<string, number[]>();
  for (const p of points) {
    const month = `${p.date.slice(0, 7)}-01`;
    buckets.set(month, [...(buckets.get(month) ?? []), p.value]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      value: mode === "sum" ? values.reduce((a, b) => a + b, 0) : values.reduce((a, b) => a + b, 0) / values.length,
    }));
}

function split(result: MetricResult, mid: string, range: RangeConfig, mode: "sum" | "avg"): MetricSeries {
  if (result.status !== "ok") return EMPTY;
  const current = result.points.filter((p) => p.date >= mid);
  const previous = result.points.filter((p) => p.date < mid);
  return range.granularity === "month" ? { current: monthly(current, mode), previous: [] } : { current, previous };
}

type SeriesKey = Exclude<keyof GameAnalytics, "status">;

type MetricPlan = {
  key: SeriesKey;
  metric: AnalyticsMetric;
  mode: "sum" | "avg";
  /** Also fetch the previous period (only where a delta is shown). */
  previous: boolean;
};

/** Game page: everything. Previous period only where a delta is displayed. */
const FULL_PLAN: MetricPlan[] = [
  { key: "dau", metric: "DailyActiveUsers", mode: "avg", previous: true },
  { key: "revenue", metric: "DailyRevenue", mode: "sum", previous: true },
  { key: "visits", metric: "Visits", mode: "sum", previous: false },
  { key: "peakCcu", metric: "PeakConcurrentPlayers", mode: "avg", previous: false },
  { key: "session", metric: "AverageSessionLengthMinutes", mode: "avg", previous: true },
  { key: "d1", metric: "ForwardD1Retention", mode: "avg", previous: true },
  { key: "d7", metric: "ForwardD7Retention", mode: "avg", previous: false },
  { key: "d30", metric: "ForwardD30Retention", mode: "avg", previous: false },
];

/** Overview: only what the studio-wide KPIs, charts and alerts use. */
const OVERVIEW_PLAN: MetricPlan[] = [
  { key: "dau", metric: "DailyActiveUsers", mode: "avg", previous: true },
  { key: "revenue", metric: "DailyRevenue", mode: "sum", previous: true },
  { key: "visits", metric: "Visits", mode: "sum", previous: false },
  { key: "peakCcu", metric: "PeakConcurrentPlayers", mode: "avg", previous: false },
  { key: "d1", metric: "ForwardD1Retention", mode: "avg", previous: false },
];

/**
 * Dashboard metrics of one experience for a range. Never throws.
 * Roblox meters every requested data point (day × metric), so each profile
 * only asks for what its page displays.
 */
export async function getGameAnalytics(
  universeId: number,
  range: RangeConfig,
  today: string,
  profile: "full" | "overview" = "full",
): Promise<GameAnalytics> {
  const { start, mid, end } = analyticsWindow(range, today);
  const ccuFloor = addDays(end, -PEAK_CCU_RETENTION_DAYS);
  const plan = profile === "overview" ? OVERVIEW_PLAN : FULL_PLAN;

  const results = await Promise.all(
    plan.map((item) => {
      let from = item.previous ? start : mid;
      if (item.metric === "PeakConcurrentPlayers" && from < ccuFloor) from = ccuFloor;
      return getDailyMetric(universeId, item.metric, from, end);
    }),
  );

  const status = overallStatus(results);

  const analytics: GameAnalytics = {
    status,
    dau: EMPTY,
    revenue: EMPTY,
    visits: EMPTY,
    peakCcu: EMPTY,
    session: EMPTY,
    d1: EMPTY,
    d7: EMPTY,
    d30: EMPTY,
  };
  plan.forEach((item, index) => {
    const result = results[index];
    if (result) analytics[item.key] = split(result, mid, range, item.mode);
  });
  return analytics;
}
