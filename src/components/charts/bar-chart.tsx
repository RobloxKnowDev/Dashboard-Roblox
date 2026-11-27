"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/i18n/client";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { formatCompact } from "@/lib/utils/format";
import { useChartView } from "./chart-card";
import { ChartDataTable, ChartLegend, ChartPlaceholder, ChartTooltipContent, type ValueFormatter } from "./parts";
import { CHART_INK, seriesColor, type SeriesConfig } from "./theme";

export type CategoryRow = { category: string } & Record<string, number | string>;

type BarChartProps = {
  data: CategoryRow[];
  series: SeriesConfig[];
  height?: number;
  /** Stack series on top of each other (parts of a whole). */
  stacked?: boolean;
  formatValue?: ValueFormatter;
  label: string;
  /** Header of the first column in the table view. */
  categoryLabel?: string;
};

const axisTick = { fill: CHART_INK.tick, fontSize: 11 };

/** Average width of an 11px axis character, to fit labels under their bar. */
const TICK_CHAR_PX = 6.5;

/** "GLIDER [1-2 PLAYER OBBY]" → "GLIDER [1-2…" when a bar has room for 12 characters. */
export function fitLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : label;
}

/**
 * Magnitude comparison across categories. Bars ≤24px, 4px rounded data-end
 * (square at the baseline), 2px surface gap between neighbors, per-bar hover.
 */
export function BarChart({
  data,
  series,
  height = 240,
  stacked = false,
  formatValue = formatCompact,
  label,
  categoryLabel,
}: BarChartProps) {
  const t = useT();
  const view = useChartView();
  const hydrated = useHydrated();
  // Category labels are shortened to the width each bar gets (phones); the
  // tooltip and the table view keep the full names.
  const figureRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(figure);
    return () => observer.disconnect();
  }, [hydrated, view]);
  const maxChars = width > 0 ? Math.max(4, Math.floor((width - 56) / Math.max(1, data.length) / TICK_CHAR_PX)) : 40;

  if (view === "table") {
    return (
      <ChartDataTable data={data} categoryKey="category" categoryLabel={categoryLabel ?? t.common.chart.category} series={series} formatValue={formatValue} />
    );
  }

  if (!hydrated) {
    return <ChartPlaceholder height={height} withLegend={series.length > 1} />;
  }

  return (
    <figure ref={figureRef} aria-label={label}>
      <ChartLegend series={series} mark="square" />
      <RechartsBarChart
        data={data}
        responsive
        style={{ width: "100%", height }}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barGap={2}
        barCategoryGap="28%"
        accessibilityLayer
      >
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis
          dataKey="category"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: CHART_INK.axis }}
          tickMargin={8}
          interval={0}
          tickFormatter={(value: string) => fitLabel(String(value), maxChars)}
        />
        <YAxis tickFormatter={formatValue} tick={axisTick} tickLine={false} axisLine={false} width="auto" tickMargin={4} />
        <Tooltip
          cursor={{ fill: "rgb(255 255 255 / 0.025)" }}
          content={(props) => <ChartTooltipContent {...props} formatValue={formatValue} />}
        />
        {series.map((s, i) => {
          const isTop = !stacked || i === series.length - 1;
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={seriesColor(s, i)}
              maxBarSize={24}
              stackId={stacked ? "stack" : undefined}
              radius={isTop ? [4, 4, 0, 0] : 0}
              stroke={stacked ? CHART_INK.surface : undefined}
              strokeWidth={stacked ? 2 : 0}
              activeBar={{ fillOpacity: 0.85 }}
              isAnimationActive={false}
            />
          );
        })}
      </RechartsBarChart>
    </figure>
  );
}
