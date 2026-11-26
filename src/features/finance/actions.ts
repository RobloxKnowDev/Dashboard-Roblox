"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseAmount, transactionSchema } from "./schemas";

const idSchema = z.uuid();

/** Creates (no id) or updates a transaction. Owners and administrators only (RLS enforces it too). */
export async function saveTransaction(input: unknown, transactionId?: string): Promise<ActionResult> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only owners and administrators can edit finances." };

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const values = parsed.data;
  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, fieldErrors: { amount: "Enter an amount above 0." } };
  if (transactionId !== undefined && !idSchema.safeParse(transactionId).success) return { ok: false, message: "Invalid transaction." };

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
  if (error) return { ok: false, message: "The transaction couldn't be saved. Try again." };

  refresh();
  return { ok: true, message: transactionId ? "Transaction updated" : "Transaction added" };
}

export async function deleteTransaction(transactionId: string): Promise<ActionResult> {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return { ok: false, message: "Only owners and administrators can edit finances." };
  if (!idSchema.safeParse(transactionId).success) return { ok: false, message: "Invalid transaction." };

  const supabase = await createClient();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", transactionId);
  if (error) return { ok: false, message: "The transaction couldn't be deleted." };
  refresh();
  return { ok: true, message: "Transaction deleted" };
}
