import "server-only";
import { getRobloxGamesBatched, type RobloxGameInfo } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";

/* LIVE: watched experiences (Supabase) + live Roblox stats + daily history. */

export type WatchedGame = {
  id: string;
  universeId: number;
  name: string;
  genre: string | null;
  notes: string | null;
  addedBy: string | null;
  addedAt: string;
  roblox: RobloxGameInfo | null;
  /** Daily snapshots (oldest → newest), from the daily job. */
  history: { date: string; ccu: number | null; visits: number | null; favorites: number | null }[];
};

export async function listWatchlist(): Promise<WatchedGame[] | null> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("game_watchlist")
    .select("id, universe_id, name, genre, notes, added_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  if (rows.length === 0) return [];

  const [roblox, snapshots] = await Promise.all([
    getRobloxGamesBatched(rows.map((r) => r.universe_id)),
    supabase
      .from("watchlist_snapshots")
      .select("watchlist_id, recorded_at, ccu, visits, favorites")
      .in("watchlist_id", rows.map((r) => r.id))
      .order("recorded_at", { ascending: true })
      .limit(rows.length * 90),
  ]);

  return rows.map((row) => ({
    id: row.id,
    universeId: row.universe_id,
    name: roblox?.get(row.universe_id)?.name ?? row.name,
    genre: roblox?.get(row.universe_id)?.genre ?? row.genre,
    notes: row.notes,
    addedBy: row.added_by,
    addedAt: row.created_at,
    roblox: roblox?.get(row.universe_id) ?? null,
    history: (snapshots.data ?? [])
      .filter((s) => s.watchlist_id === row.id)
      .map((s) => ({ date: s.recorded_at.slice(0, 10), ccu: s.ccu, visits: s.visits, favorites: s.favorites })),
  }));
}
