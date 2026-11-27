import { CircleCheck, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RequireRole } from "@/components/layout/session-widgets";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress, Skeleton } from "@/components/ui/primitives";
import { AiSettingsForm } from "@/features/ai-settings/form";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { getI18n, getT } from "@/i18n/server";
import { ASSISTANT_MODEL, IDEAS_MODEL, isClaudeConfigured } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.ai };
}

const MODEL_NAMES: Record<string, string> = { "claude-haiku-5-5": "Claude Haiku 5.5", "claude-opus-5-5": "Claude Opus 5.5" };

async function AiSection() {
  await connection();
  const { t, f } = await getI18n();
  const a = t.settings.ai;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const supabase = await createClient();
  const [{ data: settings }, { data: usage }] = await Promise.all([
    supabase.from("studio_settings").select("ai_assistant_enabled, ai_monthly_budget_usd").maybeSingle(),
    // RLS: owners only.
    supabase.from("ai_usage").select("feature, input_tokens, output_tokens, cost_usd").gte("created_at", monthStart),
  ]);
  const configured = isClaudeConfigured();
  const budget = Number(settings?.ai_monthly_budget_usd ?? 20);
  const rows = usage ?? [];
  const total = rows.reduce((acc, r) => acc + Number(r.cost_usd), 0);
  const byFeature = (["assistant", "ideas"] as const).map((feature) => {
    const own = rows.filter((r) => r.feature === feature);
    return { feature, requests: own.length, cost: own.reduce((acc, r) => acc + Number(r.cost_usd), 0) };
  });
  const tokensIn = rows.reduce((acc, r) => acc + r.input_tokens, 0);
  const tokensOut = rows.reduce((acc, r) => acc + r.output_tokens, 0);
  const usd = (value: number) => f.formatCurrency(value, { cents: true });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-fg">{a.connection}</h3>
            {configured ? (
              <Badge tone="good" icon={<CircleCheck aria-hidden />}>
                {a.connected}
              </Badge>
            ) : (
              <Badge tone="warning" icon={<CircleDashed aria-hidden />}>
                {a.notConnected}
              </Badge>
            )}
          </div>
          {configured ? null : <p className="mt-2 text-xs leading-relaxed text-fg-3">{a.notConnectedHelp}</p>}
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">{a.assistantModel}</dt>
              <dd className="text-fg-2">{MODEL_NAMES[ASSISTANT_MODEL] ?? ASSISTANT_MODEL}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">{a.ideasModel}</dt>
              <dd className="text-fg-2">{MODEL_NAMES[IDEAS_MODEL] ?? IDEAS_MODEL}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="text-[13px] font-semibold text-fg">{a.usageTitle}</h3>
          <p className="mt-0.5 text-xs text-fg-3">{a.usageDescription}</p>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold tracking-tight text-fg">{usd(total)}</span>
              <span className="text-xs text-fg-3">{a.budgetUsed(usd(total), usd(budget))}</span>
            </div>
            <Progress value={budget > 0 ? (total / budget) * 100 : 100} tone={total >= budget ? "critical" : total >= budget * 0.8 ? "warning" : "accent"} label={a.totalCost} />
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            {byFeature.map((row) => (
              <div key={row.feature} className="rounded-md border border-line bg-surface-2/40 px-3 py-2.5">
                <dt className="text-fg-3">{a.byFeature[row.feature]}</dt>
                <dd className="mt-0.5 font-semibold tabular text-fg">
                  {usd(row.cost)} <span className="font-normal text-fg-3">· {f.formatNumber(row.requests)}</span>
                </dd>
              </div>
            ))}
            <div className="rounded-md border border-line bg-surface-2/40 px-3 py-2.5">
              <dt className="text-fg-3">{a.tokens}</dt>
              <dd className="mt-0.5 font-semibold tabular text-fg">
                {f.formatCompact(tokensIn)} / {f.formatCompact(tokensOut)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-fg-3">
            {a.requests}: {f.formatNumber(rows.length)}
          </p>
        </Card>
      </div>
      <AiSettingsForm defaults={{ assistantEnabled: settings?.ai_assistant_enabled ?? true, monthlyBudgetUsd: budget }} />
    </div>
  );
}

export default function AiSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="ai" />
      <RequireRole min="owner">
        <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
          <AiSection />
        </Suspense>
      </RequireRole>
    </>
  );
}
