"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getRequestT } from "@/i18n/server";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, transactionSchema } from "./schemas";

const idSchema = z.uuid();

/** Creates (no id) or updates a transaction. Owners and administrators only (RLS enforces it too). */
export async function saveTransaction(input: unknown, transactionId?: string): Promise<ActionResult> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.finance.actions.adminOnly };

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const values = parsed.data;
  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, fieldErrors: { amount: t.finance.validation.amountPositive } };
  if (transactionId !== undefined && !idSchema.safeParse(transactionId).success) return { ok: false, message: t.finance.actions.invalid };

  const record = {
    type: values.type,
    category: values.category,
    amount,
    currency: "USD",
    robux_amount: values.robuxAmount ? Number(values.robuxAmount) : null,
    occurred_on: values.occurredOn,
    description: values.description || null,
    game_id: values.gameId || null,
    project_id: values.projectId || null,
  };

  const supabase = await createClient();
  const { error } = transactionId
    ? await supabase.from("finance_transactions").update(record).eq("id", transactionId)
    : await supabase.from("finance_transactions").insert({ ...record, created_by: access.user.id });
  if (error) return { ok: false, message: t.finance.actions.saveFailed };

  refresh();
  return { ok: true, message: transactionId ? t.finance.actions.updated : t.finance.actions.added };
}

export async function deleteTransaction(transactionId: string): Promise<ActionResult> {
  const t = await getRequestT();
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: t.finance.actions.adminOnly };
  if (!idSchema.safeParse(transactionId).success) return { ok: false, message: t.finance.actions.invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", transactionId);
  if (error) return { ok: false, message: t.finance.actions.deleteFailed };
  refresh();
  return { ok: true, message: t.finance.actions.deleted };
}
