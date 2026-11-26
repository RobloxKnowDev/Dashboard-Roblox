import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PayoutRow } from "./payouts-compute";

/* LIVE: Creator Rewards and Roblox Plus payouts recorded by the team (RLS: members read, admins write). */

/** Payouts of the given games (all games when omitted). Empty on error: revenue then shows sales only. */
export const listPayouts = cache(async (gameIds?: string[]): Promise<PayoutRow[]> => {
  const supabase = await createClient();
  let query = supabase.from("game_payouts").select("game_id, source, month, robux").order("month", { ascending: false });
  if (gameIds) {
    if (gameIds.length === 0) return [];
    query = query.in("game_id", gameIds);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((r) => ({ gameId: r.game_id, source: r.source, month: r.month, robux: Number(r.robux) }));
});
