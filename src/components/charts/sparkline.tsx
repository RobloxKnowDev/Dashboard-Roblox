"use client";

import { Line, LineChart, ReferenceDot } from "recharts";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { CHART_INK } from "./theme";

/**
 * Tiny trend line for stat cards: de-emphasized stroke, the current point in
 * the accent. Decorative — the card's value and delta carry the information.
 */
export function Sparkline({ values, height = 32 }: { values: number[]; height?: number }) {
  const hydrated = useHydrated();
  if (values.length < 2) return null;
  if (!hydrated) return <div aria-hidden style={{ height }} />;
  const data = values.map((value, index) => ({ index, value }));
  const last = data[data.length - 1];
  return (
    <div aria-hidden className="pointer-events-none">
      <LineChart data={data} responsive style={{ width: "100%", height }} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_INK.muted}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        {last ? (
          <ReferenceDot x={last.index} y={last.value} r={2.5} fill={CHART_INK.accent} stroke={CHART_INK.surface} strokeWidth={1.5} />
        ) : null}
      </LineChart>
    </div>
  );
}
