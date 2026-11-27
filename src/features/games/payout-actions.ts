"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { payoutFormSchema } from "./payout-schema";

/**
 * Records a month of Creator Rewards and Roblox Plus for one game. An empty
 * field removes that source for the month. Administrators and owners.
 */
export async function savePayouts(gameId: string, input: unknown): Promise<ActionResult> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.games.payouts.adminOnly };
  if (!z.uuid().safeParse(gameId).success) return { ok: false, message: t.games.payouts.invalidGame };
  const parsed = payoutFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { month, creatorRewards, robloxPlus } = parsed.data;
  const monthDate = `${month}-01`;

  const supabase = await createClient();
  const entries = [
    { source: "creator_rewards" as const, value: creatorRewards },
    { source: "roblox_plus" as const, value: robloxPlus },
  ];
  for (const { source, value } of entries) {
    const { error } =
      value === ""
        ? await supabase.from("game_payouts").delete().eq("game_id", gameId).eq("source", source).eq("month", monthDate)
        : await supabase
            .from("game_payouts")
            .upsert({ game_id: gameId, source, month: monthDate, robux: Number(value), created_by: access.user.id }, { onConflict: "game_id,source,month" });
    if (error) return { ok: false, message: t.games.payouts.saveFailed };
  }
  refresh();
  return { ok: true, message: t.games.payouts.saved };
}
