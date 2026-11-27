import { z } from "zod";
import { Constants, type Enums } from "@/types/database";

export type TransactionType = Enums<"transaction_type">;
export type TransactionCategory = Enums<"transaction_category">;

/*
 * Labels: t.finance.types[type] and t.finance.categories[category].
 * Zod messages are dictionary keys (finance.validation.*): forms show them with useMessage().
 */

/** Allowed categories per type — mirrors the finance_transactions check constraint. */
export const CATEGORIES_BY_TYPE: Record<TransactionType, readonly TransactionCategory[]> = {
  revenue: ["roblox_payout", "devex", "sponsorship", "other"],
  expense: ["development", "advertising", "tools", "salaries", "assets", "other"],
};

/** numeric(12, 2): up to 9,999,999,999.99. */
const MAX_AMOUNT = 9_999_999_999.99;

/**
 * "1,250.5" → 1250.5, also "49,99" / "1 250,50" (decimal comma, as typed in
 * French); null when it isn't a valid positive amount with ≤ 2 decimals.
 */
export function parseAmount(value: string): number | null {
  let cleaned = value.replace(/[\s$]/g, "");
  // A comma followed by 1–2 final digits, with no dot, is a decimal comma (thousands groups have 3 digits).
  if (!cleaned.includes(".")) cleaned = cleaned.replace(/,(\d{1,2})$/, ".$1");
  cleaned = cleaned.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

/** Shared by the form (client validation) and the Server Action (authoritative). */
export const transactionSchema = z
  .object({
    type: z.enum(Constants.public.Enums.transaction_type),
    category: z.enum(Constants.public.Enums.transaction_category),
    // Kept as text so the field can be edited freely; parsed with parseAmount.
    amount: z.string().trim().refine((v) => parseAmount(v) !== null, "finance.validation.amount"),
    robuxAmount: z.union([z.literal(""), z.string().trim().regex(/^\d{1,15}$/, "finance.validation.wholeRobux")]),
    occurredOn: z.iso.date("finance.validation.date"),
    description: z.string().trim().max(500, "finance.validation.descriptionMax"),
    gameId: z.union([z.literal(""), z.uuid()]),
    projectId: z.union([z.literal(""), z.uuid()]),
  })
  .refine((v) => CATEGORIES_BY_TYPE[v.type].includes(v.category), {
    path: ["category"],
    message: "finance.validation.categoryMismatch",
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const emptyTransaction: TransactionInput = {
  type: "revenue",
  category: "roblox_payout",
  amount: "",
  robuxAmount: "",
  occurredOn: "",
  description: "",
  gameId: "",
  projectId: "",
};
