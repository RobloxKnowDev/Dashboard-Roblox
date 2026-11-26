"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrorsOf, type FormState } from "@/features/auth/schemas";
import { checkAccess } from "@/lib/auth/session";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/types/database";

const gameStatus = z.enum(Constants.public.Enums.game_status);

const addGameSchema = z.object({
  universeId: z
    .string()
    .trim()
    .regex(/^\d{1,16}$/, "A Universe ID is a number, e.g. 10770686826.")
    .transform(Number),
  status: gameStatus,
});

/** Adds an experience by its Universe ID, filled from Roblox's public API. */
export async function addGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { status: "error", message: "Only administrators can add games." };

  const parsed = addGameSchema.safeParse({ universeId: formData.get("universeId"), status: formData.get("status") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const roblox = await getRobloxGames([parsed.data.universeId]);
  if (roblox === null) return { status: "error", message: "Roblox couldn't be reached. Try again in a moment." };
  const info = roblox.get(parsed.data.universeId);
  if (!info) return { status: "error", fieldErrors: { universeId: "No Roblox experience has this Universe ID." } };

  const supabase = await createClient();
  const { error } = await supabase.from("games").insert({
    universe_id: info.universeId,
    place_id: info.rootPlaceId,
    name: info.name.slice(0, 200),
    description: info.description.slice(0, 4000) || null,
    genre: info.genre,
    status: parsed.data.status,
    thumbnail_url: info.iconUrl,
    launched_at: info.created,
    created_by: access.user.id,
  });

  if (error) {
    if (error.code === "23505") return { status: "error", fieldErrors: { universeId: "This game is already in your list." } };
    return { status: "error", message: "The game couldn't be saved. Try again." };
  }

  refresh();
  return { status: "success", message: `${info.name} was added.` };
}

const idSchema = z.uuid();

export async function updateGameStatus(gameId: string, status: string): Promise<{ ok: boolean; message?: string }> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only administrators can change a game's status." };
  const id = idSchema.safeParse(gameId);
  const next = gameStatus.safeParse(status);
  if (!id.success || !next.success) return { ok: false, message: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ status: next.data }).eq("id", id.data);
  if (error) return { ok: false, message: "The status couldn't be updated." };
  refresh();
  return { ok: true };
}

export async function removeGame(gameId: string): Promise<{ ok: boolean; message?: string }> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only administrators can remove a game." };
  const id = idSchema.safeParse(gameId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.from("games").delete().eq("id", id.data);
  if (error) return { ok: false, message: "The game couldn't be removed." };
  refresh();
  return { ok: true };
}
