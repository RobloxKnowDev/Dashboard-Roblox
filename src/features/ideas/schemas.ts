import { z } from "zod";

/*
 * Error messages are dictionary keys (ideas.validation.*): the form shows
 * them in the interface language with useMessage().
 */
const text = (max: 60 | 200 | 1000) => z.string().trim().max(max, `ideas.validation.max${max}`);

export const ideaSchema = z.object({
  title: z.string().trim().min(2, "ideas.validation.titleRequired").max(160, "ideas.validation.max160"),
  pitch: text(1000),
  genre: text(60),
  targetAudience: text(200),
  coreLoop: text(1000),
  monetization: text(1000),
  /** "" or a whole number 0–100 (kept as text for the form). */
  score: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100), "ideas.validation.score"),
});

export type IdeaInput = z.infer<typeof ideaSchema>;

export const emptyIdea: IdeaInput = { title: "", pitch: "", genre: "", targetAudience: "", coreLoop: "", monetization: "", score: "" };
