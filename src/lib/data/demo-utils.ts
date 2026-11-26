import { DEMO_NOW } from "./source";

/**
 * Deterministic pseudo-random generator (mulberry32). Demo datasets must be
 * reproducible and prerender-safe, so they never use Math.random().
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ISO date (YYYY-MM-DD) `daysAgo` days before the demo reference date. */
export function demoDay(daysAgo: number): string {
  const date = new Date(DEMO_NOW);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

type SeriesSpec<K extends string> = {
  key: K;
  /** Value at the start of the range. */
  start: number;
  /** Total relative growth over the range, e.g. 0.4 for +40%. */
  growth: number;
  /** Day-to-day noise amplitude, relative to the value. */
  noise?: number;
  /** Weekend uplift (Roblox traffic peaks on weekends). */
  weekendBoost?: number;
};

/** Daily time series ending at the demo reference date. */
export function demoDailySeries<K extends string>(
  days: number,
  specs: SeriesSpec<K>[],
  seed = 1,
): ({ date: string } & Record<K, number>)[] {
  const rand = seededRandom(seed);
  return Array.from({ length: days }, (_, i) => {
    const daysAgo = days - 1 - i;
    const date = demoDay(daysAgo);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const values = {} as Record<K, number>;
    for (const spec of specs) {
      const trend = spec.start * (1 + (spec.growth * i) / Math.max(1, days - 1));
      const noise = 1 + (rand() - 0.5) * 2 * (spec.noise ?? 0.06);
      const weekend = isWeekend ? 1 + (spec.weekendBoost ?? 0) : 1;
      values[spec.key] = Math.round(trend * noise * weekend);
    }
    return { date, ...values };
  });
}
