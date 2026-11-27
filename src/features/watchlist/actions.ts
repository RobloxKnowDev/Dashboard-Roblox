"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";

/** Any failure means "not a valid Universe ID" (one translated message). */
const universeIdSchema = z.coerce.number().int().positive().max(9_999_999_999_999);

/** Starts watching an experience. Developer+. */
export async function addToWatchlist(universeId: unknown): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.discover.watchlist.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbidden(t.common.roles.developer) };
  const parsed = universeIdSchema.safeParse(universeId);
  if (!parsed.success) return { ok: false, fieldErrors: { universeId: m.invalidUniverseId } };

  const roblox = await getRobloxGames([parsed.data]);
  if (roblox === null) return { ok: false, message: m.robloxUnreachable };
  const info = roblox.get(parsed.data);
  if (!info) return { ok: false, fieldErrors: { universeId: m.unknownUniverseId } };

  const supabase = await createClient();
  const { error } = await supabase.from("game_watchlist").insert({
    universe_id: info.universeId,
    name: info.name.slice(0, 200),
    thumbnail_url: info.iconUrl,
    genre: info.genre,
    added_by: access.user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: m.alreadyWatched(info.name) };
    return { ok: false, message: m.addFailed };
  }
  refresh();
  return { ok: true, message: m.watching(info.name) };
}

const notesSchema = z.object({ id: z.uuid(), notes: z.string().trim().max(2000) });

export async function updateWatchNotes(id: string, notes: string): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.discover.watchlist.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbidden(t.common.roles.developer) };
  const parsed = notesSchema.safeParse({ id, notes });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.path[0] === "notes" ? m.notesTooLong : m.invalidRequest };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("game_watchlist").update({ notes: parsed.data.notes || null }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: m.notesFailed };
  refresh();
  return { ok: true, message: m.notesSaved };
}

/** Stops watching. RLS: administrators, or the member who added it. */
export async function removeFromWatchlist(id: string): Promise<ActionResult> {
  const t = await getRequestT();
  const m = t.discover.watchlist.actions;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: m.forbidden(t.common.roles.developer) };
  if (!z.uuid().safeParse(id).success) return { ok: false, message: m.invalidRequest };

  const supabase = await createClient();
  const { data, error } = await supabase.from("game_watchlist").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: m.removeFailed };
  if (!data?.length) return { ok: false, message: m.removeForbidden };
  refresh();
  return { ok: true, message: m.removed };
}
