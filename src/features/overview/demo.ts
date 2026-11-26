/**
 * DEMONSTRATION DATA for the Overview — game analytics, agents, market and
 * alerts, until their integrations ship (Milestones C–D).
 *
 * Deterministic (seeded, relative to DEMO_NOW): prerender-safe and stable.
 * Every name is fictional. Never written to the database, never combined
 * with live figures.
 */
import { seededRandom } from "@/lib/data/demo-utils";
import { DEMO_NOW } from "@/lib/data/source";
import type { Database } from "@/types/database";
import type { RangeConfig } from "./range";

export type SeriesPoint = { date: string; value: number };

type SeriesSpec = {
  /** Typical daily value at DEMO_NOW. */
  base: number;
  /** Year-over-year growth, e.g. 0.8 = +80% per year. */
  yearlyGrowth: number;
  /** Relative day-to-day noise. */
  noise: number;
  /** Roblox traffic peaks on weekends. */
  weekendBoost?: number;
  /** How months aggregate daily values (12-month range). */
  monthly: "sum" | "avg";
};

function isoDay(daysAgo: number): string {
  const d = new Date(DEMO_NOW);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoMonth(monthsAgo: number): string {
  const d = new Date(Date.UTC(DEMO_NOW.getUTCFullYear(), DEMO_NOW.getUTCMonth() - monthsAgo, 1));
  return d.toISOString().slice(0, 10);
}

/** Current period + the equal-length period before it (for deltas). */
function periodSeries(range: RangeConfig, spec: SeriesSpec, seed: number): { current: SeriesPoint[]; previous: SeriesPoint[] } {
  const rand = seededRandom(seed);
  const total = range.points * 2;
  const points: SeriesPoint[] = [];

  for (let i = total - 1; i >= 0; i--) {
    const noise = 1 + (rand() - 0.5) * 2 * spec.noise;
    if (range.granularity === "day") {
      const date = isoDay(i);
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const weekend = weekday === 0 || weekday === 6 ? 1 + (spec.weekendBoost ?? 0) : 1;
      const growth = Math.pow(1 + spec.yearlyGrowth, -i / 365);
      points.push({ date, value: Math.round(spec.base * growth * noise * weekend) });
    } else {
      const growth = Math.pow(1 + spec.yearlyGrowth, -i / 12);
      const days = spec.monthly === "sum" ? 30.4 : 1;
      points.push({ date: isoMonth(i), value: Math.round(spec.base * days * growth * (1 + (noise - 1) * 0.4)) });
    }
  }
  return { previous: points.slice(0, range.points), current: points.slice(range.points) };
}

const sum = (points: SeriesPoint[]) => points.reduce((acc, p) => acc + p.value, 0);
const avg = (points: SeriesPoint[]) => (points.length ? sum(points) / points.length : 0);
const ratio = (current: number, previous: number) => (previous > 0 ? current / previous - 1 : 0);

/** Fictional demo games — deliberately unlike any of the studio's real titles. */
const DEMO_GAMES = [
  { name: "Lava Escape", ccu: 1850, dau: 9200, visits: 21000, revenue: 310, seed: 11 },
  { name: "Sky Racers", ccu: 1120, dau: 6100, visits: 14500, revenue: 190, seed: 23 },
  { name: "Pet Café", ccu: 640, dau: 3800, visits: 8900, revenue: 120, seed: 37 },
  { name: "Mine Tycoon", ccu: 310, dau: 1900, visits: 4200, revenue: 55, seed: 41 },
] as const;

const totals = DEMO_GAMES.reduce(
  (acc, g) => ({ ccu: acc.ccu + g.ccu, dau: acc.dau + g.dau, visits: acc.visits + g.visits, revenue: acc.revenue + g.revenue }),
  { ccu: 0, dau: 0, visits: 0, revenue: 0 },
);

export type DemoGameMetrics = ReturnType<typeof getDemoGameMetrics>;

/** Studio-wide game analytics for a range (DEMO). */
export function getDemoGameMetrics(range: RangeConfig) {
  const revenue = periodSeries(range, { base: totals.revenue, yearlyGrowth: 0.9, noise: 0.12, weekendBoost: 0.3, monthly: "sum" }, 101);
  const ccu = periodSeries(range, { base: totals.ccu * 1.6, yearlyGrowth: 0.7, noise: 0.1, weekendBoost: 0.45, monthly: "avg" }, 202);
  const dau = periodSeries(range, { base: totals.dau, yearlyGrowth: 0.75, noise: 0.07, weekendBoost: 0.35, monthly: "avg" }, 303);
  const visits = periodSeries(range, { base: totals.visits, yearlyGrowth: 0.8, noise: 0.08, weekendBoost: 0.4, monthly: "sum" }, 404);

  // Studio growth: cumulative lifetime visits across the range.
  const lifetimeBefore = 48_600_000 - sum(visits.current);
  let running = lifetimeBefore;
  const growth = visits.current.map((p) => ({ date: p.date, value: (running += p.value) }));

  const perGame = DEMO_GAMES.map((game) => {
    const series = periodSeries(range, { base: game.visits, yearlyGrowth: 0.8, noise: 0.1, weekendBoost: 0.4, monthly: "sum" }, game.seed);
    return { category: game.name, visits: sum(series.current) };
  });

  const lastCcu = ccu.current[ccu.current.length - 1]?.value ?? 0;

  return {
    revenue: {
      total: sum(revenue.current),
      delta: ratio(sum(revenue.current), sum(revenue.previous)),
      series: revenue.current,
    },
    ccu: {
      // "Right now": a bit under the day's peak.
      now: Math.round(lastCcu * 0.82),
      delta: ratio(avg(ccu.current), avg(ccu.previous)),
      series: ccu.current,
    },
    dau: {
      average: Math.round(avg(dau.current)),
      delta: ratio(avg(dau.current), avg(dau.previous)),
      series: dau.current,
    },
    growth,
    perGame,
  };
}

type AgentStatus = Database["public"]["Enums"]["agent_status"];

export type DemoAgent = {
  id: string;
  name: string;
  project: string;
  mission: string;
  status: AgentStatus;
  /** Minutes before DEMO_NOW. */
  lastActivityMinutesAgo: number;
};

export const DEMO_AGENTS: DemoAgent[] = [
  { id: "a1", name: "Build Agent", project: "Lava Escape", mission: "Ship the winter map update", status: "working", lastActivityMinutesAgo: 2 },
  { id: "a2", name: "Balance Agent", project: "Pet Café", mission: "Tune the economy sinks", status: "error", lastActivityMinutesAgo: 25 },
  { id: "a3", name: "QA Agent", project: "Sky Racers", mission: "Regression tests on kart physics", status: "waiting", lastActivityMinutesAgo: 47 },
  { id: "a4", name: "Market Scout", project: "Market Intelligence", mission: "Scan this week's Roblox releases", status: "completed", lastActivityMinutesAgo: 180 },
  { id: "a5", name: "Asset Agent", project: "Mine Tycoon", mission: "Generate shop UI icons", status: "offline", lastActivityMinutesAgo: 2880 },
];

export const DEMO_MARKET_HIGHLIGHTS = [
  { name: "Obby Rush Deluxe", genre: "Obby", ccu: 48_200, growth: 0.62 },
  { name: "Tower Tycoon X", genre: "Tycoon", ccu: 31_900, growth: 0.38 },
  { name: "Mystery Mansion", genre: "Horror", ccu: 22_400, growth: 0.27 },
  { name: "Pet Racers", genre: "Racing", ccu: 15_100, growth: 0.21 },
  { name: "Sky Islands", genre: "Adventure", ccu: 9_800, growth: 0.19 },
];

export type DemoAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
};

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: "al1",
    severity: "critical",
    title: "Balance Agent stopped with an error",
    detail: "Pet Café · economy simulation timed out after 30 min",
    href: "/agents",
  },
  {
    id: "al2",
    severity: "warning",
    title: "Day-1 retention dropped to 4.1%",
    detail: "Sky Racers · down from 9.8% the previous week",
    href: "/games",
  },
  {
    id: "al3",
    severity: "info",
    title: "New CCU peak: 5,412 players",
    detail: "Lava Escape · Saturday 8 PM UTC",
    href: "/games",
  },
];
