import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, `${max.toLocaleString("en-US")} characters maximum.`);

export const ideaSchema = z.object({
  title: z.string().trim().min(2, "Give the idea a title.").max(160, "160 characters maximum."),
  pitch: text(1000),
  genre: text(60),
  targetAudience: text(200),
  coreLoop: text(1000),
  monetization: text(1000),
  /** "" or a whole number 0–100 (kept as text for the form). */
  score: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100), "A whole number between 0 and 100."),
});

export type IdeaInput = z.infer<typeof ideaSchema>;

export const emptyIdea: IdeaInput = { title: "", pitch: "", genre: "", targetAudience: "", coreLoop: "", monetization: "", score: "" };
