import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/*
 * LIVE: the studio's games (Supabase, RLS) — Roblox data is merged by the
 * callers from lib/integrations/roblox. Failed queries return null so the UI
 * can show an error instead of an empty list.
 */

export type GameRow = Tables<"games">;

const STATUS_ORDER: Record<GameRow["status"], number> = { live: 0, testing: 1, in_development: 2, paused: 3, archived: 4 };

export const listGames = cache(async (): Promise<GameRow[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*").order("name");
  if (error) return null;
  return data.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
});

/** undefined = not found, null = query failed. Memoized per request. */
export const getGame = cache(async (id: string): Promise<GameRow | undefined | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return data ?? undefined;
});

/** Robux → USD rate used for estimates (Settings → General). */
export async function getDevexRate(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("studio_settings").select("devex_rate_usd").maybeSingle();
  return data?.devex_rate_usd ?? 0.0038;
}
