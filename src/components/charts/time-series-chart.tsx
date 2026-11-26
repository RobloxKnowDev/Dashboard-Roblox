"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { formatCompact, formatShortDate } from "@/lib/utils/format";
import { useChartView } from "./chart-card";
import { ChartDataTable, ChartLegend, ChartPlaceholder, ChartTooltipContent, type ValueFormatter } from "./parts";
import { CHART_INK, seriesColor, type SeriesConfig } from "./theme";

export type TimeSeriesRow = { date: string } & Record<string, number | string>;

type TimeSeriesChartProps = {
  data: TimeSeriesRow[];
  series: SeriesConfig[];
  /** "area" for one or two cumulative-feeling measures, "line" for comparisons. */
  variant?: "area" | "line";
  height?: number;
  formatValue?: ValueFormatter;
  formatDate?: (iso: string) => string;
  /** Accessible summary of what the chart shows. */
  label: string;
};

const axisTick = { fill: CHART_INK.tick, fontSize: 11 };

/**
 * Change-over-time chart. Hairline horizontal grid, recessive axes, 2px lines,
 * ~10% area wash, crosshair + one tooltip listing every series.
 */
export function TimeSeriesChart({
  data,
  series,
  variant = "area",
  height = 240,
  formatValue = formatCompact,
  formatDate = formatShortDate,
  label,
}: TimeSeriesChartProps) {
  const view = useChartView();
  const hydrated = useHydrated();
  const gradientPrefix = useId().replace(/:/g, "");

  if (view === "table") {
    return (
      <ChartDataTable
        data={data}
        categoryKey="date"
        categoryLabel="Date"
        series={series}
        formatValue={formatValue}
        formatCategory={formatDate}
      />
    );
  }

  if (!hydrated) {
    return <ChartPlaceholder height={height} withLegend={series.length > 1} />;
  }

  const common = {
    data,
    responsive: true,
    style: { width: "100%", height },
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
    accessibilityLayer: true,
  };

  const grid = <CartesianGrid vertical={false} stroke={CHART_INK.grid} />;
  const xAxis = (
    <XAxis
      dataKey="date"
      tickFormatter={formatDate}
      tick={axisTick}
      tickLine={false}
      axisLine={{ stroke: CHART_INK.axis }}
      minTickGap={28}
      tickMargin={8}
    />
  );
  const yAxis = (
    <YAxis tickFormatter={formatValue} tick={axisTick} tickLine={false} axisLine={false} width={48} tickMargin={4} />
  );
  const tooltip = (
    <Tooltip
      cursor={{ stroke: CHART_INK.crosshair, strokeWidth: 1 }}
      content={(props) => (
        <ChartTooltipContent {...props} formatValue={formatValue} formatLabel={formatDate} />
      )}
    />
  );

  return (
    <figure aria-label={label}>
      <ChartLegend series={series} mark={variant === "line" ? "line" : "square"} />
      {variant === "area" ? (
        <AreaChart {...common}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradientPrefix}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(s, i)} stopOpacity={0.16} />
                <stop offset="100%" stopColor={seriesColor(s, i)} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(s, i)}
              strokeWidth={2}
              fill={`url(#${gradientPrefix}-${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface, fill: seriesColor(s, i) }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart {...common}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(s, i)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface, fill: seriesColor(s, i) }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      )}
    </figure>
  );
}
