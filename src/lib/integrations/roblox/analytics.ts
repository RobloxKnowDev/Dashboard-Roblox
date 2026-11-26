import "server-only";
import { cacheLife } from "next/cache";

/**
 * Roblox Open Cloud — Analytics Query API (key with universe.analytics:read).
 * Daily data, about one day behind.
 *
 * - Several keys are supported (one per Roblox group/account): the key that
 *   can read an experience is resolved once and cached.
 * - Results are cached for an hour; only successful and "not authorized"
 *   answers are cached — transient failures are retried on the next request.
 * - At most 4 requests are in flight, and "too many requests" (429) answers
 *   are retried with backoff, to stay within Roblox's limits.
 */

export const ANALYTICS_METRICS = [
  "DailyActiveUsers",
  "DailyRevenue",
  "Visits",
  "PeakConcurrentPlayers",
  "AverageSessionLengthMinutes",
  "ForwardD1Retention",
  "ForwardD7Retention",
  "ForwardD30Retention",
  "PayingUsers",
] as const;

export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];

export type DailyPoint = { date: string; value: number };

export type MetricResult =
  | { status: "ok"; points: DailyPoint[] }
  | { status: "unauthorized" }
  | { status: "not_configured" }
  | { status: "error"; message: string };

const BASE = "https://apis.roblox.com/analytics-query-api";
const MAX_CONCURRENT = 4;
const MAX_RATE_LIMIT_RETRIES = 2;

type QueryResponse = {
  path?: string;
  done?: boolean;
  response?: { values?: { dataPoints?: { time: string; value: number }[] }[] };
};

class TransientError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ── Keys ──────────────────────────────────────────────────────────────── */

/**
 * All configured keys: ROBLOX_OPEN_CLOUD_API_KEY, then _2 … _5. A key can only
 * read the experiences its owner may access, so a studio with games in
 * several Roblox groups sets one key per group.
 */
function apiKeys(): string[] {
  const names = ["", "_2", "_3", "_4", "_5"].map((suffix) => `ROBLOX_OPEN_CLOUD_API_KEY${suffix}`);
  return names.map((name) => process.env[name]?.trim() ?? "").filter((value) => value.length > 0);
}

/* ── HTTP with a concurrency cap and 429 backoff ───────────────────────── */

let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight += 1;
  try {
    return await task();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

/**
 * Keys that exhausted their retries on 429 rest for a minute: hammering a
 * key that is over its data-point budget only delays its recovery.
 */
const COOL_DOWN_MS = 60_000;
const coolingUntil = new Map<string, number>();

async function call(url: string, init: RequestInit, key: string): Promise<{ status: number; body: QueryResponse }> {
  if ((coolingUntil.get(key) ?? 0) > Date.now()) return { status: 429, body: {} };
  for (let attempt = 0; ; attempt++) {
    const response = await withSlot(() =>
      fetch(url, {
        ...init,
        headers: { ...init.headers, "x-api-key": key, "content-type": "application/json" },
        signal: AbortSignal.timeout(15_000),
      }),
    );
    if (response.status === 429) {
      if (attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1500 * 2 ** attempt);
        continue;
      }
      coolingUntil.set(key, Date.now() + COOL_DOWN_MS);
    }
    const body = (await response.json().catch(() => ({}))) as QueryResponse;
    return { status: response.status, body };
  }
}

/** One query with one key. Returns ok/unauthorized, throws TransientError otherwise. */
async function runQuery(universeId: number, metric: AnalyticsMetric, startDate: string, endDate: string, key: string): Promise<MetricResult> {
  let { status, body } = await call(
    `${BASE}/v1/universes/${universeId}/metrics`,
    {
      method: "POST",
      body: JSON.stringify({ metric, granularity: "OneDay", startTime: `${startDate}T00:00:00Z`, endTime: `${endDate}T00:00:00Z` }),
    },
    key,
  );

  // Slow queries become long-running operations: poll until done.
  for (let attempt = 0; (status === 200 || status === 202) && body.done === false && body.path && attempt < 10; attempt++) {
    await sleep(1200);
    ({ status, body } = await call(`${BASE}/${body.path}`, { method: "GET" }, key));
  }

  if (status === 401 || status === 403) return { status: "unauthorized" };
  if (status !== 200 || body.done === false) {
    // Server logs only (Vercel → Logs) — never the key.
    console.warn(`[roblox-analytics] ${metric} for universe ${universeId}: HTTP ${status}${body.done === false ? " (still running)" : ""}`);
    throw new TransientError(`Roblox analytics HTTP ${status}`);
  }

  const points = (body.response?.values?.[0]?.dataPoints ?? []).map((p) => ({ date: p.time.slice(0, 10), value: p.value }));
  return { status: "ok", points };
}

/* ── Cached layers ─────────────────────────────────────────────────────── */

/**
 * Index of the key that can read this experience, or -1 if none can.
 * Probed once with a tiny query and cached; `keyCount` is part of the cache
 * key so adding a key triggers a new probe.
 */
async function resolveKeyIndex(universeId: number, keyCount: number): Promise<number> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86_400 });

  const keys = apiKeys().slice(0, keyCount);
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  for (const [index, key] of keys.entries()) {
    const result = await runQuery(universeId, "DailyActiveUsers", start, end, key);
    if (result.status === "ok") return index;
  }
  return -1;
}

async function queryCached(universeId: number, metric: AnalyticsMetric, startDate: string, endDate: string): Promise<MetricResult> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86_400 });

  const keys = apiKeys();
  if (keys.length === 0) return { status: "not_configured" };
  const index = await resolveKeyIndex(universeId, keys.length);
  const key = keys[index];
  if (index < 0 || !key) return { status: "unauthorized" };
  return runQuery(universeId, metric, startDate, endDate, key);
}

/**
 * Daily values of one metric for one experience, for [startDate, endDate)
 * (ISO days, UTC). Never throws.
 */
export async function getDailyMetric(
  universeId: number,
  metric: AnalyticsMetric,
  startDate: string,
  endDate: string,
): Promise<MetricResult> {
  try {
    return await queryCached(universeId, metric, startDate, endDate);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}
