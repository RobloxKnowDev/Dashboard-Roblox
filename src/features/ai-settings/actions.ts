"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { messages } from "@/i18n/messages";
import { getRequestLocale } from "@/i18n/server";
import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  assistantEnabled: z.boolean(),
  monthlyBudgetUsd: z.number().min(0).max(10_000),
});

/** Owner only (also enforced in PostgreSQL by the guard_ai_settings trigger). */
export async function updateAiSettings(input: unknown): Promise<ActionResult> {
  const t = messages[await getRequestLocale()].settings.ai;
  const access = await checkAccess("owner");
  if (access.status !== "allowed") return { ok: false, message: t.ownerOnly };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: t.invalidBudget };

  const supabase = await createClient();
  const { error } = await supabase
    .from("studio_settings")
    .update({ ai_assistant_enabled: parsed.data.assistantEnabled, ai_monthly_budget_usd: parsed.data.monthlyBudgetUsd, updated_by: access.user.id })
    .eq("id", true);
  if (error) return { ok: false, message: t.failed };
  revalidatePath("/settings/ai");
  revalidatePath("/assistant");
  return { ok: true, message: t.saved };
}
