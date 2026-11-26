import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHART_SORTS, getCharts, type ChartSortId } from "@/lib/integrations/roblox/explore";
import { getRobloxGamesBatched } from "@/lib/integrations/roblox/public";

/**
 * Daily snapshot job (Vercel Cron, see vercel.json). Records:
 *  1. Roblox charts — rank and players of each charted experience
 *  2. the watchlist — players, visits, favorites
 *  3. the studio's own games — public stats into game_metrics (long-term history)
 * Idempotent per day. Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 */

const SNAPSHOT_SORTS: ChartSortId[] = ["top-trending", "up-and-coming", "top-playing-now", "top-earning", "top-rated", "most-popular"];

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const recordedAt = `${today}T00:00:00Z`;
  const summary: Record<string, unknown> = { day: today };

  // 1. Charts
  const charts = await getCharts();
  if (charts) {
    const rows = SNAPSHOT_SORTS.flatMap((sortId) =>
      (charts[sortId] ?? []).map((game) => ({
        recorded_on: today,
        sort_id: sortId,
        rank: game.rank,
        universe_id: game.universeId,
        name: game.name.slice(0, 200),
        genre: game.genre,
        player_count: game.playerCount,
        up_votes: game.upVotes,
        down_votes: game.downVotes,
      })),
    );
    const { error } = await admin.from("market_snapshots").upsert(rows, { onConflict: "universe_id,sort_id,recorded_on" });
    summary.charts = error ? `error: ${error.message}` : `${rows.length} rows (${SNAPSHOT_SORTS.map((s) => CHART_SORTS[s]).join(", ")})`;
  } else {
    summary.charts = "Roblox charts unavailable";
  }

  // 2. Watchlist + 3. own games share one Roblox lookup.
  const [watchlist, games] = await Promise.all([
    admin.from("game_watchlist").select("id, universe_id"),
    admin.from("games").select("id, universe_id").neq("status", "archived"),
  ]);
  const ids = [...(watchlist.data ?? []).map((w) => w.universe_id), ...(games.data ?? []).map((g) => g.universe_id)];
  const roblox = ids.length ? await getRobloxGamesBatched(ids) : new Map();

  if (roblox && watchlist.data?.length) {
    const { data: existing } = await admin.from("watchlist_snapshots").select("watchlist_id").eq("recorded_at", recordedAt);
    const done = new Set((existing ?? []).map((e) => e.watchlist_id));
    const rows = watchlist.data
      .filter((w) => !done.has(w.id) && roblox.has(w.universe_id))
      .map((w) => {
        const info = roblox.get(w.universe_id);
        return { watchlist_id: w.id, recorded_at: recordedAt, ccu: info?.playing ?? null, visits: info?.visits ?? null, favorites: info?.favorites ?? null };
      });
    const { error } = rows.length ? await admin.from("watchlist_snapshots").insert(rows) : { error: null };
    summary.watchlist = error ? `error: ${error.message}` : `${rows.length} new snapshots`;
  }

  if (roblox && games.data?.length) {
    const rows = games.data
      .filter((g) => roblox.has(g.universe_id))
      .map((g) => {
        const info = roblox.get(g.universe_id);
        return {
          game_id: g.id,
          period: "day" as const,
          recorded_at: recordedAt,
          ccu: info?.playing ?? null,
          visits: info?.visits ?? null,
          favorites: info?.favorites ?? null,
          source: "roblox_public_api",
        };
      });
    const { error } = await admin.from("game_metrics").upsert(rows, { onConflict: "game_id,period,recorded_at" });
    summary.games = error ? `error: ${error.message}` : `${rows.length} games recorded`;
  }

  if (!roblox) summary.roblox = "Roblox public API unavailable";
  return NextResponse.json(summary);
}
