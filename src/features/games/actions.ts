"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrorsOf, type FormState } from "@/features/auth/schemas";
import { getRequestT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/types/database";

const gameStatus = z.enum(Constants.public.Enums.game_status);

const addGameSchema = z.object({
  universeId: z
    .string()
    .trim()
    .regex(/^\d{1,16}$/, "games.validation.universeId")
    .transform(Number),
  status: gameStatus,
});

/** Adds an experience by its Universe ID, filled from Roblox's public API. */
export async function addGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { status: "error", message: t.games.actions.adminOnlyAdd };

  const parsed = addGameSchema.safeParse({ universeId: formData.get("universeId"), status: formData.get("status") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const roblox = await getRobloxGames([parsed.data.universeId]);
  if (roblox === null) return { status: "error", message: t.games.actions.robloxUnreachable };
  const info = roblox.get(parsed.data.universeId);
  if (!info) return { status: "error", fieldErrors: { universeId: t.games.actions.unknownUniverse } };

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
    if (error.code === "23505") return { status: "error", fieldErrors: { universeId: t.games.actions.duplicate } };
    return { status: "error", message: t.games.actions.saveFailed };
  }

  refresh();
  return { status: "success", message: t.games.actions.added(info.name) };
}

const idSchema = z.uuid();

export async function updateGameStatus(gameId: string, status: string): Promise<{ ok: boolean; message?: string }> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.games.actions.adminOnlyStatus };
  const id = idSchema.safeParse(gameId);
  const next = gameStatus.safeParse(status);
  if (!id.success || !next.success) return { ok: false, message: t.games.actions.invalidRequest };

  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ status: next.data }).eq("id", id.data);
  if (error) return { ok: false, message: t.games.actions.statusFailed };
  refresh();
  return { ok: true };
}

export async function removeGame(gameId: string): Promise<{ ok: boolean; message?: string }> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.games.actions.adminOnlyRemove };
  const id = idSchema.safeParse(gameId);
  if (!id.success) return { ok: false, message: t.games.actions.invalidRequest };

  const supabase = await createClient();
  const { error } = await supabase.from("games").delete().eq("id", id.data);
  if (error) return { ok: false, message: t.games.actions.removeFailed };
  refresh();
  return { ok: true };
}
