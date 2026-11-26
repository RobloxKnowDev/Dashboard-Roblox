"use server";

import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import type { DataSource } from "@/lib/data/source";
import { getAssistantProvider } from "./provider";
import { chatHistorySchema } from "./types";

/** Answers the last user message. Nothing is stored while the provider is the demo. */
export async function askAssistant(history: unknown): Promise<ActionResult<{ content: string; source: DataSource }>> {
  const access = await checkAccess("viewer");
  if (access.status !== "allowed") return { ok: false, message: "Your account doesn't have access yet." };
  const parsed = chatHistorySchema.safeParse(history);
  if (!parsed.success) return { ok: false, message: "This message can't be sent (empty or too long)." };

  const provider = getAssistantProvider();
  try {
    const content = await provider.reply(parsed.data);
    return { ok: true, data: { content, source: provider.source } };
  } catch {
    return { ok: false, message: "The assistant couldn't answer. Try again." };
  }
}
