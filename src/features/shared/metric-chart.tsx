"use client";

import { BarChart, type CategoryRow } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart, type TimeSeriesRow } from "@/components/charts/time-series-chart";
import { EmptyState } from "@/components/feedback/states";
import { useFormat, useT } from "@/i18n/client";
import type { DataSource } from "@/lib/data/source";
import type { Formatters } from "@/lib/utils/format";

/** Value formats, by name — functions can't cross the server/client boundary. */
export type ValueFormat = "compact" | "robux" | "usd" | "percent" | "rate" | "minutes";

function valueFormatter(f: Formatters, format: ValueFormat): (value: number) => string {
  switch (format) {
    case "compact":
      return f.formatCompact;
    case "robux":
      return f.formatRobux;
    case "usd":
      return (v) => f.formatCurrency(v, { compact: v >= 10_000 });
    case "percent":
      return f.formatPercent;
    case "rate":
      return f.formatPrecisePercent;
    case "minutes":
      return (v) => `${f.formatNumber(Math.round(v * 10) / 10)} min`;
  }
}

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
  series: { key: string; label: string; color?: string }[];
  granularity?: "day" | "month";
  variant?: "area" | "line";
}) {
  const f = useFormat();
  const t = useT();
  const dates =
    granularity === "month"
      ? { formatDate: f.formatMonth, formatLabel: f.formatMonthYear }
      : { formatDate: f.formatShortDate, formatLabel: f.formatDate };
  return (
    <ChartCard title={common.title} description={common.description} source={common.source}>
      {rows.length === 0 ? (
        <EmptyState compact title={t.common.states.noDataPeriod} description={common.emptyMessage ?? t.common.states.noDataYet} />
      ) : (
        <TimeSeriesChart
          label={common.label}
          data={rows}
          series={series}
          variant={variant}
          formatValue={valueFormatter(f, common.format)}
          {...dates}
        />
      )}
    </ChartCard>
  );
}

export function MetricBarChart({
  rows,
  series,
  stacked,
  categoryLabel,
  ...common
}: Common & {
  rows: CategoryRow[];
  series: { key: string; label: string; color?: string }[];
  stacked?: boolean;
  categoryLabel?: string;
}) {
  const f = useFormat();
  const t = useT();
  return (
    <ChartCard title={common.title} description={common.description} source={common.source}>
      {rows.length === 0 ? (
        <EmptyState compact title={t.common.states.noDataPeriod} description={common.emptyMessage} />
      ) : (
        <BarChart
          label={common.label}
          data={rows}
          series={series}
          stacked={stacked}
          categoryLabel={categoryLabel}
          formatValue={valueFormatter(f, common.format)}
        />
      )}
    </ChartCard>
  );
}
