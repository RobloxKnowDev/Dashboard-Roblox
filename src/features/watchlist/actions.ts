"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";

const universeIdSchema = z.coerce
  .number({ message: "A Universe ID is a number, e.g. 10770686826." })
  .int()
  .positive("A Universe ID is a number, e.g. 10770686826.")
  .max(9_999_999_999_999);

/** Starts watching an experience. Developer+. */
export async function addToWatchlist(universeId: unknown): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to edit the watchlist." };
  const parsed = universeIdSchema.safeParse(universeId);
  if (!parsed.success) return { ok: false, fieldErrors: { universeId: parsed.error.issues[0]?.message } };

  const roblox = await getRobloxGames([parsed.data]);
  if (roblox === null) return { ok: false, message: "Roblox couldn't be reached. Try again in a moment." };
  const info = roblox.get(parsed.data);
  if (!info) return { ok: false, fieldErrors: { universeId: "No Roblox experience has this Universe ID." } };

  const supabase = await createClient();
  const { error } = await supabase.from("game_watchlist").insert({
    universe_id: info.universeId,
    name: info.name.slice(0, 200),
    thumbnail_url: info.iconUrl,
    genre: info.genre,
    added_by: access.user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: `${info.name} is already on the watchlist.` };
    return { ok: false, message: "The game couldn't be added. Try again." };
  }
  refresh();
  return { ok: true, message: `Watching ${info.name}` };
}

const notesSchema = z.object({ id: z.uuid(), notes: z.string().trim().max(2000, "2,000 characters maximum.") });

export async function updateWatchNotes(id: string, notes: string): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to edit the watchlist." };
  const parsed = notesSchema.safeParse({ id, notes });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("game_watchlist").update({ notes: parsed.data.notes || null }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: "The notes couldn't be saved." };
  refresh();
  return { ok: true, message: "Notes saved" };
}

/** Stops watching. RLS: administrators, or the member who added it. */
export async function removeFromWatchlist(id: string): Promise<ActionResult> {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: "You need the Developer role to edit the watchlist." };
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Invalid request." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("game_watchlist").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: "The game couldn't be removed." };
  if (!data?.length) return { ok: false, message: "Only administrators or the member who added it can remove it." };
  refresh();
  return { ok: true, message: "Removed from the watchlist" };
}
