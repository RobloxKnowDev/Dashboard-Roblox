/**
 * Every piece of data the UI displays carries its origin. Widgets fed by
 * "demo" data render a DEMO badge automatically, and demo and live data are
 * never combined in the same figure.
 */
export type DataSource = "live" | "demo";

export type DataResult<T> = {
  data: T;
  source: DataSource;
};

export function liveData<T>(data: T): DataResult<T> {
  return { data, source: "live" };
}

export function demoData<T>(data: T): DataResult<T> {
  return { data, source: "demo" };
}

/**
 * Fixed reference date for demo datasets. Demo data is generated relative to
 * this instant so it is deterministic (prerender-safe) and reproducible.
 */
export const DEMO_NOW = new Date("2026-11-26T12:00:00.000Z");
