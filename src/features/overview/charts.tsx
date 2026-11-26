"use client";

import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import type { DataSource } from "@/lib/data/source";
import { formatCompact, formatCurrency, formatDate, formatMonth, formatMonthYear, formatShortDate } from "@/lib/utils/format";
import type { SeriesPoint } from "./demo";

type Granularity = "day" | "month";

type SeriesChartProps = {
  points: SeriesPoint[];
  granularity: Granularity;
  source: DataSource;
  rangeLabel: string;
};

function dateFormatters(granularity: Granularity) {
  return granularity === "month"
    ? { formatDate: formatMonth, formatLabel: formatMonthYear }
    : { formatDate: formatShortDate, formatLabel: formatDate };
}

function toRows(points: SeriesPoint[], key: string) {
  return points.map((p) => ({ date: p.date, [key]: p.value }));
}

export function RevenueOverviewChart({ points, granularity, source, rangeLabel }: SeriesChartProps) {
  return (
    <ChartCard
      title="Revenue overview"
      description={`${granularity === "month" ? "Monthly" : "Daily"} revenue in USD, ${rangeLabel}`}
      source={source}
    >
      <TimeSeriesChart
        label={`Revenue in USD per ${granularity}, ${rangeLabel}`}
        data={toRows(points, "revenue")}
        series={[{ key: "revenue", label: "Revenue" }]}
        formatValue={(v) => formatCurrency(v, { compact: v >= 10_000 })}
        {...dateFormatters(granularity)}
      />
    </ChartCard>
  );
}

export function CcuOverviewChart({ points, granularity, source, rangeLabel }: SeriesChartProps) {
  return (
    <ChartCard
      title="CCU overview"
      description={`${granularity === "month" ? "Average daily peak" : "Daily peak"} concurrent players, ${rangeLabel}`}
      source={source}
    >
      <TimeSeriesChart
        label={`Peak concurrent players per ${granularity}, ${rangeLabel}`}
        data={toRows(points, "ccu")}
        series={[{ key: "ccu", label: "Peak CCU" }]}
        variant="line"
        formatValue={formatCompact}
        {...dateFormatters(granularity)}
      />
    </ChartCard>
  );
}

export function StudioGrowthChart({ points, granularity, source, rangeLabel }: SeriesChartProps) {
  return (
    <ChartCard title="Studio growth" description={`Lifetime visits across all games, ${rangeLabel}`} source={source}>
      <TimeSeriesChart
        label={`Cumulative lifetime visits, ${rangeLabel}`}
        data={toRows(points, "visits")}
        series={[{ key: "visits", label: "Lifetime visits" }]}
        formatValue={formatCompact}
        {...dateFormatters(granularity)}
      />
    </ChartCard>
  );
}

export function GamePerformanceChart({
  games,
  source,
  rangeLabel,
}: {
  games: { category: string; visits: number }[];
  source: DataSource;
  rangeLabel: string;
}) {
  return (
    <ChartCard title="Game performance" description={`Visits per game, ${rangeLabel}`} source={source}>
      <BarChart
        label={`Visits per game, ${rangeLabel}`}
        data={[...games].sort((a, b) => b.visits - a.visits)}
        series={[{ key: "visits", label: "Visits" }]}
      />
    </ChartCard>
  );
}
