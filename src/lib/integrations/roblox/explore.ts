import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife } from "next/cache";

/**
 * Roblox's public charts (the "Charts" page of roblox.com), via the explore
 * API. Not officially documented by Roblox: if its shape changes, callers get
 * null and show "unavailable" instead of wrong numbers. Cached 15 minutes in
 * the shared remote cache.
 */

export const CHART_SORTS = {
  "top-trending": "Top Trending",
  "up-and-coming": "Up-and-Coming",
  "top-playing-now": "Top Playing Now",
  "top-earning": "Top Earning",
  "top-rated": "Top Rated",
  "most-popular": "Most Popular",
  "top-revisited": "Top Revisited",
  "fun-with-friends": "Fun with Friends",
} as const;

export type ChartSortId = keyof typeof CHART_SORTS;

export type ChartGame = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount: number;
  upVotes: number;
  downVotes: number;
  genre: string | null;
  /** 1-based position in the chart (sponsored entries excluded). */
  rank: number;
};

export type Charts = Partial<Record<ChartSortId, ChartGame[]>>;

const BASE = "https://apis.roblox.com/explore-api/v1/get-sorts";

type ExploreGame = {
  universeId?: number;
  rootPlaceId?: number;
  name?: string;
  playerCount?: number;
  totalUpVotes?: number;
  totalDownVotes?: number;
  isSponsored?: boolean;
  genreL1?: string;
};
type ExploreSort = { sortId?: string; contentType?: string; games?: ExploreGame[] };
type ExploreResponse = { sorts?: ExploreSort[]; nextSortsPageToken?: string };

function isChartSort(id: string | undefined): id is ChartSortId {
  return !!id && id in CHART_SORTS;
}

async function fetchPage(sessionId: string, token?: string): Promise<ExploreResponse> {
  const params = new URLSearchParams({ sessionId, device: "computer", country: "all" });
  if (token) params.set("sortsPageToken", token);
  const response = await fetch(`${BASE}?${params}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Roblox explore ${response.status}`);
  return (await response.json()) as ExploreResponse;
}

async function fetchChartsCached(): Promise<Charts> {
  "use cache: remote";
  cacheLife({ stale: 900, revalidate: 900, expire: 7200 });

  const sessionId = randomUUID();
  const charts: Charts = {};
  let token: string | undefined;
  // The charts are spread over a few pages of "sorts".
  for (let page = 0; page < 3; page++) {
    const body = await fetchPage(sessionId, token);
    for (const sort of body.sorts ?? []) {
      if (sort.contentType !== "Games" || !isChartSort(sort.sortId)) continue;
      const games = (sort.games ?? [])
        .filter((g) => !g.isSponsored && typeof g.universeId === "number" && g.name)
        .map((g, index) => ({
          universeId: g.universeId as number,
          rootPlaceId: g.rootPlaceId ?? 0,
          name: g.name as string,
          playerCount: g.playerCount ?? 0,
          upVotes: g.totalUpVotes ?? 0,
          downVotes: g.totalDownVotes ?? 0,
          genre: g.genreL1 || null,
          rank: index + 1,
        }));
      if (games.length) charts[sort.sortId] = games;
    }
    token = body.nextSortsPageToken;
    if (!token) break;
  }
  if (Object.keys(charts).length === 0) throw new Error("Roblox explore returned no charts");
  return charts;
}

/** Current Roblox charts, or null when Roblox can't be reached / changed format. */
export async function getCharts(): Promise<Charts | null> {
  try {
    return await fetchChartsCached();
  } catch {
    return null;
  }
}
