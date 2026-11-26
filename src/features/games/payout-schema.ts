import { z } from "zod";

const robux = z.union([z.literal(""), z.string().trim().regex(/^\d{1,12}$/, "Whole Robux only, e.g. 12500.")]);

export const payoutFormSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month."),
    creatorRewards: robux,
    robloxPlus: robux,
  })
  .refine((v) => v.month >= "2020-01", { path: ["month"], message: "Pick a month from 2020 onwards." });

export type PayoutFormInput = z.infer<typeof payoutFormSchema>;
