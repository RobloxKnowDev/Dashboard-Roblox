import "server-only";
import { cache } from "react";
import { CHART_SORTS, getCharts, type ChartGame, type ChartSortId } from "@/lib/integrations/roblox/explore";
import { getRobloxGamesBatched } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";

/*
 * LIVE market intelligence: Roblox charts (now) + experience details +
 * our own daily snapshots (history → evolution). Everything here is real;
 * when a source is unreachable the page says so instead of inventing data.
 */

export type DiscoverGame = ChartGame & {
  iconUrl: string | null;
  visits: number | null;
  favorites: number | null;
  created: string | null;
  updated: string | null;
  /** Days since the experience was created (null if unknown). */
  ageDays: number | null;
  /** Players now vs. our snapshot of yesterday / 7 days ago (null = no history yet). */
  playersYesterday: number | null;
  playersLastWeek: number | null;
};

function daysBetween(fromIso: string, today: string): number {
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(fromIso)) / 86_400_000);
}

function addDays(isoDay: string, days: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Players recorded in our daily snapshots, by universe, for two reference days. */
async function playerHistory(universeIds: number[], today: string) {
  const yesterday = addDays(today, -1);
  const lastWeek = addDays(today, -7);
  const empty = { yesterday: new Map<number, number>(), lastWeek: new Map<number, number>(), hasHistory: false };
  if (universeIds.length === 0) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("market_snapshots")
    .select("universe_id, recorded_on, player_count")
    .in("universe_id", universeIds)
    .in("recorded_on", [yesterday, lastWeek]);
  if (!data) return empty;

  for (const row of data) {
    const target = row.recorded_on === yesterday ? empty.yesterday : empty.lastWeek;
    target.set(row.universe_id, Math.max(target.get(row.universe_id) ?? 0, row.player_count));
  }
  empty.hasHistory = data.length > 0;
  return empty;
}

async function enrich(games: ChartGame[], today: string): Promise<{ games: DiscoverGame[]; hasHistory: boolean }> {
  const ids = games.map((g) => g.universeId);
  const [details, history] = await Promise.all([getRobloxGamesBatched(ids), playerHistory(ids, today)]);
  return {
    hasHistory: history.hasHistory,
    games: games.map((game) => {
      const info = details?.get(game.universeId);
      return {
        ...game,
        iconUrl: info?.iconUrl ?? null,
        visits: info?.visits ?? null,
        favorites: info?.favorites ?? null,
        created: info?.created ?? null,
        updated: info?.updated ?? null,
        ageDays: info ? daysBetween(info.created, today) : null,
        playersYesterday: history.yesterday.get(game.universeId) ?? null,
        playersLastWeek: history.lastWeek.get(game.universeId) ?? null,
      };
    }),
  };
}

export type ChartResult = { status: "ok"; games: DiscoverGame[]; hasHistory: boolean } | { status: "unavailable" };

/** One Roblox chart, enriched. Memoized per request. */
export const getChart = cache(async (sortId: ChartSortId, today: string): Promise<ChartResult> => {
  const charts = await getCharts();
  const games = charts?.[sortId];
  if (!games) return { status: "unavailable" };
  return { status: "ok", ...(await enrich(games, today)) };
});

/**
 * Recently created experiences that already appear in Roblox's charts —
 * Roblox has no "new releases" chart, so this is the closest real signal.
 */
export const getRecentReleases = cache(async (today: string, maxAgeDays: number): Promise<ChartResult> => {
  const charts = await getCharts();
  if (!charts) return { status: "unavailable" };

  // Charts where new experiences show up (the "all-time" charts rarely hold new games).
  const sources: ChartSortId[] = ["top-trending", "up-and-coming", "top-playing-now", "fun-with-friends", "top-revisited"];
  const best = new Map<number, ChartGame & { charts: string[] }>();
  for (const [sortId, games] of Object.entries(charts).filter(([id]) => sources.includes(id as ChartSortId))) {
    for (const game of games ?? []) {
      const current = best.get(game.universeId);
      const label = CHART_SORTS[sortId as ChartSortId];
      if (!current) best.set(game.universeId, { ...game, charts: [label] });
      else current.charts.push(label);
    }
  }

  const { games, hasHistory } = await enrich([...best.values()], today);
  const recent = games
    .filter((g) => g.ageDays !== null && g.ageDays <= maxAgeDays)
    .sort((a, b) => b.playerCount - a.playerCount)
    .map((g, index) => ({ ...g, rank: index + 1 }));
  return { status: "ok", games: recent, hasHistory };
});

/** Universe IDs already on the watchlist (to show "Watching"). */
export const getWatchedUniverseIds = cache(async (): Promise<Set<number>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("game_watchlist").select("universe_id");
  return new Set((data ?? []).map((row) => row.universe_id));
});
