import "server-only";
import type { DataSource } from "@/lib/data/source";
import { demoReply } from "./demo";
import type { ChatMessage } from "./types";

/**
 * Where assistant answers come from. Phase 1 ships the DEMO provider only;
 * connecting Claude means adding a provider here (Anthropic SDK, server-side
 * ANTHROPIC_API_KEY, studio context from Supabase) and returning it from
 * getAssistantProvider(). The chat UI and the Server Action don't change.
 */
export interface AssistantProvider {
  readonly source: DataSource;
  reply(history: ChatMessage[]): Promise<string>;
}

const demoProvider: AssistantProvider = {
  source: "demo",
  async reply(history) {
    const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
    return demoReply(question);
  },
};

export function getAssistantProvider(): AssistantProvider {
  return demoProvider;
}
