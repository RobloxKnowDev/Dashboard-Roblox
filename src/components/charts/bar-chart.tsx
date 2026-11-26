"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
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
  categoryLabel = "Category",
}: BarChartProps) {
  const view = useChartView();
  const hydrated = useHydrated();

  if (view === "table") {
    return (
      <ChartDataTable data={data} categoryKey="category" categoryLabel={categoryLabel} series={series} formatValue={formatValue} />
    );
  }

  if (!hydrated) {
    return <ChartPlaceholder height={height} withLegend={series.length > 1} />;
  }

  return (
    <figure aria-label={label}>
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
        />
        <YAxis tickFormatter={formatValue} tick={axisTick} tickLine={false} axisLine={false} width={48} tickMargin={4} />
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
