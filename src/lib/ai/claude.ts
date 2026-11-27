import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude (Anthropic API). The key stays on the server (ANTHROPIC_API_KEY);
 * every request is logged in ai_usage with an estimated cost (lib/ai/usage.ts).
 *
 * Models (decided with the studio):
 * - AI Assistant: Claude Haiku 5.5 — every member can use it, so the cheapest model.
 * - Weekly game ideas: Claude Opus 5.5 — one run a week, judgment matters more than cost.
 */
export const ASSISTANT_MODEL = "claude-haiku-5-5";
export const IDEAS_MODEL = "claude-opus-5-5";

/** USD per million tokens (Anthropic list prices, Nov 2026). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/** Estimated cost of one response, in USD. */
export function estimateCost(model: string, usage: TokenUsage): number {
  const price = PRICES[model] ?? PRICES["claude-opus-5-5"]!;
  return (
    (usage.input_tokens * price.input +
      usage.output_tokens * price.output +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite) /
    1_000_000
  );
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | undefined;

/** Shared client, or null when ANTHROPIC_API_KEY isn't set. */
export function getClaude(): Anthropic | null {
  if (!isClaudeConfigured()) return null;
  // Two retries on 429/5xx (SDK default); generous timeout for the ideas run.
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), maxRetries: 2, timeout: 120_000 });
  return client;
}
