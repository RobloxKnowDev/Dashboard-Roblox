import { z } from "zod";

/* Messages are dictionary keys (games.validation.*): the form shows them with useMessage(). */

const robux = z.union([z.literal(""), z.string().trim().regex(/^\d{1,12}$/, "games.validation.wholeRobux")]);

export const payoutFormSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "games.validation.pickMonth"),
    creatorRewards: robux,
    robloxPlus: robux,
  })
  .refine((v) => v.month >= "2020-01", { path: ["month"], message: "games.validation.monthFrom2020" });

export type PayoutFormInput = z.infer<typeof payoutFormSchema>;
