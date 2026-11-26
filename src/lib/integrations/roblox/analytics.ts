import "server-only";
import { cacheLife } from "next/cache";

/**
 * Roblox Open Cloud — Analytics Query API (key with universe.analytics:read).
 * Daily data, about one day behind. Cached for an hour to stay well within
 * Roblox's data-point budget; only successful and "not authorized" answers
 * are cached, transient failures are retried on the next request.
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

type QueryResponse = {
  path?: string;
  done?: boolean;
  response?: { values?: { dataPoints?: { time: string; value: number }[] }[] };
};

class TransientError extends Error {}

async function call(url: string, init: RequestInit, key: string): Promise<{ status: number; body: QueryResponse }> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, "x-api-key": key, "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as QueryResponse;
  return { status: response.status, body };
}

/** Cached core. Throws TransientError for anything worth retrying later. */
async function queryCached(universeId: number, metric: AnalyticsMetric, startDate: string, endDate: string): Promise<MetricResult> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86_400 });

  const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
  if (!key) return { status: "not_configured" };

  let { status, body } = await call(
    `${BASE}/v1/universes/${universeId}/metrics`,
    {
      method: "POST",
      body: JSON.stringify({
        metric,
        granularity: "OneDay",
        startTime: `${startDate}T00:00:00Z`,
        endTime: `${endDate}T00:00:00Z`,
      }),
    },
    key,
  );

  // Slow queries become long-running operations: poll until done.
  for (let attempt = 0; (status === 200 || status === 202) && body.done === false && body.path && attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    ({ status, body } = await call(`${BASE}/${body.path}`, { method: "GET" }, key));
  }

  if (status === 401 || status === 403) return { status: "unauthorized" };
  if (status !== 200 || body.done === false) throw new TransientError(`Roblox analytics HTTP ${status}`);

  const points = (body.response?.values?.[0]?.dataPoints ?? []).map((p) => ({ date: p.time.slice(0, 10), value: p.value }));
  return { status: "ok", points };
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
