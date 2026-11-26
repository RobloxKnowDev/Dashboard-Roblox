"use client";

import { BarChart, type CategoryRow } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart, type TimeSeriesRow } from "@/components/charts/time-series-chart";
import { EmptyState } from "@/components/feedback/states";
import type { DataSource } from "@/lib/data/source";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatMonth,
  formatMonthYear,
  formatPercent,
  formatRobux,
  formatShortDate,
} from "@/lib/utils/format";

/** Value formats, by name — functions can't cross the server/client boundary. */
export type ValueFormat = "compact" | "robux" | "usd" | "percent" | "minutes";

const FORMATTERS: Record<ValueFormat, (value: number) => string> = {
  compact: formatCompact,
  robux: formatRobux,
  usd: (v) => formatCurrency(v, { compact: v >= 10_000 }),
  percent: formatPercent,
  minutes: (v) => `${v.toFixed(1)} min`,
};

type Common = {
  title: string;
  description?: string;
  source: DataSource;
  format: ValueFormat;
  /** Accessible summary of the chart. */
  label: string;
  /** Shown instead of the chart when there are no points. */
  emptyMessage?: string;
};

export function MetricChart({
  rows,
  series,
  granularity = "day",
  variant = "area",
  ...common
}: Common & {
  rows: TimeSeriesRow[];
  series: { key: string; label: string }[];
  granularity?: "day" | "month";
  variant?: "area" | "line";
}) {
  const dates =
    granularity === "month"
      ? { formatDate: formatMonth, formatLabel: formatMonthYear }
      : { formatDate: formatShortDate, formatLabel: formatDate };
  return (
    <ChartCard title={common.title} description={common.description} source={common.source}>
      {rows.length === 0 ? (
        <EmptyState compact title="No data for this period" description={common.emptyMessage ?? "Roblox hasn't reported values for these days yet."} />
      ) : (
        <TimeSeriesChart
          label={common.label}
          data={rows}
          series={series}
          variant={variant}
          formatValue={FORMATTERS[common.format]}
          {...dates}
        />
      )}
    </ChartCard>
  );
}

export function MetricBarChart({
  rows,
  series,
  ...common
}: Common & { rows: CategoryRow[]; series: { key: string; label: string }[] }) {
  return (
    <ChartCard title={common.title} description={common.description} source={common.source}>
      {rows.length === 0 ? (
        <EmptyState compact title="No data for this period" description={common.emptyMessage} />
      ) : (
        <BarChart label={common.label} data={rows} series={series} formatValue={FORMATTERS[common.format]} />
      )}
    </ChartCard>
  );
}
