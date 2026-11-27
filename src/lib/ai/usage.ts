import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCost, isClaudeConfigured, type TokenUsage } from "./claude";

export type AiFeature = "assistant" | "ideas";

/** Logs one Claude response (never throws — logging must not break the answer). */
export async function recordUsage(entry: { feature: AiFeature; model: string; usage: TokenUsage; userId: string | null }): Promise<number> {
  const cost = estimateCost(entry.model, entry.usage);
  try {
    await createAdminClient().from("ai_usage").insert({
      feature: entry.feature,
      model: entry.model,
      user_id: entry.userId,
      input_tokens: entry.usage.input_tokens,
      output_tokens: entry.usage.output_tokens,
      cache_read_tokens: entry.usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: entry.usage.cache_creation_input_tokens ?? 0,
      cost_usd: Number(cost.toFixed(6)),
    });
  } catch (error) {
    console.warn("[ai-usage] couldn't log usage", error instanceof Error ? error.message : error);
  }
  return cost;
}

/** First day of the current month (UTC), ISO. */
function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Estimated Claude spend since the start of the month, in USD. */
export async function monthSpend(now: Date): Promise<number> {
  const { data } = await createAdminClient().from("ai_usage").select("cost_usd").gte("created_at", monthStart(now));
  return (data ?? []).reduce((acc, row) => acc + Number(row.cost_usd), 0);
}

export type AiSettings = { assistantEnabled: boolean; monthlyBudgetUsd: number };

export async function getAiSettings(): Promise<AiSettings> {
  const { data } = await createAdminClient().from("studio_settings").select("ai_assistant_enabled, ai_monthly_budget_usd").maybeSingle();
  return { assistantEnabled: data?.ai_assistant_enabled ?? true, monthlyBudgetUsd: Number(data?.ai_monthly_budget_usd ?? 20) };
}

/** Why Claude can't be used right now, or null when it can. */
export async function aiBlockReason(now: Date, feature: AiFeature): Promise<"not_configured" | "disabled" | "budget" | null> {
  if (!isClaudeConfigured()) return "not_configured";
  const settings = await getAiSettings();
  if (feature === "assistant" && !settings.assistantEnabled) return "disabled";
  if ((await monthSpend(now)) >= settings.monthlyBudgetUsd) return "budget";
  return null;
}
