"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { updateAiSettings } from "./actions";

/** Owner controls: assistant on/off and the monthly budget. */
export function AiSettingsForm({ defaults }: { defaults: { assistantEnabled: boolean; monthlyBudgetUsd: number } }) {
  const t = useT();
  const a = t.settings.ai;
  const [enabled, setEnabled] = useState(defaults.assistantEnabled);
  const [budget, setBudget] = useState(String(defaults.monthlyBudgetUsd));
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(budget.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 10_000) {
      setError(a.invalidBudget);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await updateAiSettings({ assistantEnabled: enabled, monthlyBudgetUsd: value });
      if (result.ok) toast.success(result.message ?? a.saved);
      else toast.error(result.message ?? a.failed);
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-[13px] font-semibold text-fg">{a.controlsTitle}</h3>
      <form noValidate onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="ai-assistant-enabled" className="text-[13px] font-medium text-fg">
              {a.assistantEnabled}
            </label>
            <p className="mt-0.5 text-xs text-fg-3">{a.assistantEnabledHint}</p>
          </div>
          <Switch id="ai-assistant-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Field htmlFor="ai-budget" label={a.budget} hint={a.budgetHint} error={error}>
          <Input
            id="ai-budget"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            aria-invalid={!!error}
            className="max-w-40"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            {a.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}
