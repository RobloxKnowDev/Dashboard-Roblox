import { z } from "zod";
import { Constants, type Enums } from "@/types/database";

export type TransactionType = Enums<"transaction_type">;
export type TransactionCategory = Enums<"transaction_category">;

/** Allowed categories per type — mirrors the finance_transactions check constraint. */
export const CATEGORIES_BY_TYPE: Record<TransactionType, readonly TransactionCategory[]> = {
  revenue: ["roblox_payout", "devex", "sponsorship", "other"],
  expense: ["development", "advertising", "tools", "salaries", "assets", "other"],
};

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  roblox_payout: "Roblox payout",
  devex: "DevEx",
  sponsorship: "Sponsorship",
  development: "Development",
  advertising: "Advertising",
  tools: "Tools & software",
  salaries: "Salaries",
  assets: "Assets",
  other: "Other",
};

export const TYPE_LABELS: Record<TransactionType, string> = { revenue: "Revenue", expense: "Expense" };

/** numeric(12, 2): up to 9,999,999,999.99. */
const MAX_AMOUNT = 9_999_999_999.99;

/** "1,250.5" → 1250.5; null when it isn't a valid positive amount with ≤ 2 decimals. */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[\s,$]/g, "");
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
    amount: z.string().trim().refine((v) => parseAmount(v) !== null, "Enter an amount above 0, e.g. 1250 or 49.99."),
    robuxAmount: z.union([z.literal(""), z.string().trim().regex(/^\d{1,15}$/, "Whole Robux only, e.g. 350000.")]),
    occurredOn: z.iso.date("Pick a valid date."),
    description: z.string().trim().max(500, "500 characters maximum."),
    gameId: z.union([z.literal(""), z.uuid()]),
    projectId: z.union([z.literal(""), z.uuid()]),
  })
  .refine((v) => CATEGORIES_BY_TYPE[v.type].includes(v.category), {
    path: ["category"],
    message: "This category doesn't match the transaction type.",
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
