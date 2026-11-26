import { z } from "zod";

/** Limits shared by the chat UI and the Server Action. */
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_HISTORY = 40;

export const chatHistorySchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) }))
  .min(1)
  .max(MAX_HISTORY);

export type ChatMessage = z.infer<typeof chatHistorySchema>[number];

export const SUGGESTIONS = [
  "How did revenue evolve over the last 30 days?",
  "Which game has the best retention?",
  "What should the team focus on this week?",
  "Suggest 3 game ideas based on current trends",
] as const;
