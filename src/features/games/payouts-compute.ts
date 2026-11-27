/*
 * Creator Rewards and Roblox Plus payouts are recorded per month. To add them
 * to daily revenue figures, each month is spread evenly over its days (the
 * current month over the days elapsed so far) — an estimate, labelled as such.
 * Pure functions, unit-tested.
 */

import { messages, type Messages } from "@/i18n/messages";

export type PayoutSource = "creator_rewards" | "roblox_plus";

/** Labels are Roblox program names — the same in every language. */
export const PAYOUT_SOURCES: { key: PayoutSource; label: string }[] = [
  { key: "creator_rewards", label: "Creator Rewards" },
  { key: "roblox_plus", label: "Roblox Plus" },
];

export type PayoutRow = { gameId: string; source: PayoutSource; month: string; robux: number };
type Point = { date: string; value: number };

function addDays(isoDay: string, days: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/**
 * Days a month's payout is spread over: the whole month, or — for the
 * current month — the days up to yesterday (Roblox figures lag one day).
 */
export function spreadDays(month: string, today: string): number {
  if (month.slice(0, 7) !== today.slice(0, 7)) return daysInMonth(month);
  return Math.max(1, Number(today.slice(8, 10)) - 1);
}

/** Daily payout estimate for every day in [from, to) that has one. */
export function dailyPayouts(rows: PayoutRow[], from: string, to: string, today: string): Point[] {
  const perMonth = new Map<string, number>();
  for (const row of rows) {
    const key = row.month.slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + row.robux);
  }
  const points: Point[] = [];
  for (let day = from; day < to; day = addDays(day, 1)) {
    const total = perMonth.get(day.slice(0, 7));
    if (!total) continue;
    // Current month: only the days already elapsed carry a share.
    if (day.slice(0, 7) === today.slice(0, 7) && day >= today) continue;
    points.push({ date: day, value: total / spreadDays(`${day.slice(0, 7)}-01`, today) });
  }
  return points;
}

/** Sums daily points into month buckets dated YYYY-MM-01. */
export function toMonthly(points: Point[]): Point[] {
  const buckets = new Map<string, number>();
  for (const p of points) buckets.set(`${p.date.slice(0, 7)}-01`, (buckets.get(`${p.date.slice(0, 7)}-01`) ?? 0) + p.value);
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

/** Point-wise sum of two series (dates from both). */
export function addSeries(a: Point[], b: Point[]): Point[] {
  const totals = new Map<string, number>();
  for (const p of [...a, ...b]) totals.set(p.date, (totals.get(p.date) ?? 0) + p.value);
  return [...totals.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([date, value]) => ({ date, value }));
}

/**
 * Payout series for an analytics window: current period [mid, end) and
 * previous period [start, mid), daily or monthly like the revenue series.
 */
export function payoutSeries(
  rows: PayoutRow[],
  window: { start: string; mid: string; end: string },
  granularity: "day" | "month",
  today: string,
): { current: Point[]; previous: Point[] } {
  const current = dailyPayouts(rows, window.mid, window.end, today);
  if (granularity === "month") return { current: toMonthly(current), previous: [] };
  return { current, previous: window.start < window.mid ? dailyPayouts(rows, window.start, window.mid, today) : [] };
}

/** The last `count` months (YYYY-MM-01), current month first. */
export function recentMonths(today: string, count = 12): string[] {
  const [year, month] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
  });
}

/** Two series on the union of their dates, missing days as 0 (for charts). */
export function alignSeries(a: Point[], b: Point[]): { a: Point[]; b: Point[] } {
  const dates = [...new Set([...a, ...b].map((p) => p.date))].sort();
  const ma = new Map(a.map((p) => [p.date, p.value]));
  const mb = new Map(b.map((p) => [p.date, p.value]));
  return { a: dates.map((date) => ({ date, value: ma.get(date) ?? 0 })), b: dates.map((date) => ({ date, value: mb.get(date) ?? 0 })) };
}

/**
 * Chart rows/series for revenue: game sales, plus rewards when any were recorded.
 * Series labels: pass t.games.revenueChart (English when omitted).
 */
export function revenueChart(sales: Point[], rewards: Point[], labels: Messages["games"]["revenueChart"] = messages.en.games.revenueChart) {
  if (rewards.length === 0) {
    return { rows: sales.map((p) => ({ date: p.date, sales: p.value })), series: [{ key: "sales", label: labels.robux }] };
  }
  const { a, b } = alignSeries(sales, rewards);
  return {
    rows: a.map((p, i) => ({ date: p.date, sales: p.value, rewards: b[i]?.value ?? 0 })),
    series: [
      { key: "sales", label: labels.sales },
      { key: "rewards", label: labels.rewards },
    ],
  };
}
