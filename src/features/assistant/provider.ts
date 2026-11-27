import "server-only";
import { aiBlockReason } from "@/lib/ai/usage";

/**
 * Where assistant answers come from:
 * - "live": Claude (claude.ts) — needs ANTHROPIC_API_KEY, the assistant
 *   switched on by an owner, and the monthly AI budget not reached;
 * - "demo": illustrative answers (demo.ts) when no API key is configured.
 */
export type AssistantMode = "live" | "demo" | "disabled" | "budget";

export async function getAssistantMode(now: Date): Promise<AssistantMode> {
  const reason = await aiBlockReason(now, "assistant");
  if (reason === "not_configured") return "demo";
  return reason ?? "live";
}
