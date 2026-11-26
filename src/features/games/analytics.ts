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

/** All dashboard metrics of one experience for a range. Never throws. */
export async function getGameAnalytics(universeId: number, range: RangeConfig, today: string): Promise<GameAnalytics> {
  const { start, mid, end } = analyticsWindow(range, today);
  const ccuStart = [start, addDays(end, -PEAK_CCU_RETENTION_DAYS)].sort().at(-1) ?? start;

  const query = (metric: AnalyticsMetric, from = start) => getDailyMetric(universeId, metric, from, end);
  const [dau, revenue, visits, peakCcu, session, d1, d7, d30] = await Promise.all([
    query("DailyActiveUsers"),
    query("DailyRevenue"),
    query("Visits"),
    query("PeakConcurrentPlayers", ccuStart),
    query("AverageSessionLengthMinutes"),
    query("ForwardD1Retention"),
    query("ForwardD7Retention"),
    query("ForwardD30Retention"),
  ]);

  const results = [dau, revenue, visits, peakCcu, session, d1, d7, d30];
  const status: AnalyticsStatus = results.some((r) => r.status === "ok")
    ? "ok"
    : results.every((r) => r.status === "unauthorized")
      ? "unauthorized"
      : results.some((r) => r.status === "not_configured")
        ? "not_configured"
        : "error";

  return {
    status,
    dau: split(dau, mid, range, "avg"),
    revenue: split(revenue, mid, range, "sum"),
    visits: split(visits, mid, range, "sum"),
    peakCcu: split(peakCcu, mid, range, "avg"),
    session: split(session, mid, range, "avg"),
    d1: split(d1, mid, range, "avg"),
    d7: split(d7, mid, range, "avg"),
    d30: split(d30, mid, range, "avg"),
  };
}
