import { CalendarCheck, DollarSign, Gauge, Rocket, Trophy } from "lucide-react";
import { connection } from "next/server";
import { SummaryPanel } from "@/components/data/summary-panel";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { getStudioMetrics } from "@/features/overview/studio";
import { MetricBarChart, MetricChart } from "@/features/shared/metric-chart";
import { parseRange } from "@/features/shared/range";
import { getI18n, getLocale } from "@/i18n/server";

/*
 * LIVE: the studio's earnings in dollars only — every game's earnings
 * (sales + rewards, the same figures as the Overview) times the conversion
 * rate of Settings → General. Made to be shown: no platform name, no
 * platform currency, no game names anywhere on the page.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function EarningsBoard({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const range = parseRange((await searchParams).range, locale);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const [studio, { t, f }] = await Promise.all([getStudioMetrics(range.key, today, locale), getI18n()]);
  const e = t.earnings;

  if (studio.status === "error") {
    return (
      <Card>
        <ErrorState title={e.empty.errorTitle} description={e.empty.errorDescription} />
      </Card>
    );
  }
  if (studio.status !== "ok" || studio.analyticsCount === 0) {
    return (
      <Card>
        <EmptyState icon={DollarSign} title={e.empty.title} description={e.empty.description} />
      </Card>
    );
  }

  const rate = studio.devexRate;
  const monthly = range.granularity === "month";
  const points = studio.revenue.series.map((p) => ({ date: p.date, usd: p.value * rate }));
  const total = studio.revenue.total * rate;
  const previous = studio.revenue.previous === null ? null : studio.revenue.previous * rate;
  const delta = previous !== null && previous > 0 ? total / previous - 1 : undefined;
  const perDay = total / range.days;
  const best = points.reduce<(typeof points)[number] | null>((top, p) => (!top || p.usd > top.usd ? p : top), null);
  const latest = [...points].reverse().find((p) => p.usd > 0) ?? null;
  const when = (date: string) => (monthly ? f.formatMonthYear(date) : f.formatDate(date));
  const money = (value: number) => f.formatCurrency(value, { compact: value >= 1_000_000 });

  const growth = points.reduce<{ date: string; total: number }[]>(
    (acc, p) => [...acc, { date: p.date, total: (acc.at(-1)?.total ?? 0) + p.usd }],
    [],
  );
  const bars = points.map((p) => ({ category: monthly ? f.formatMonth(p.date) : f.formatShortDate(p.date), usd: p.usd }));

  return (
    <div className="space-y-4">
      <SummaryPanel
        title={e.hero.summary}
        description={e.figures.over(range.label)}
        info={t.earnings.page.info}
        hero={{
          label: e.hero.title,
          value: f.formatCurrency(total, { compact: false, cents: true }),
          info: e.hero.info,
          icon: DollarSign,
          delta,
          deltaLabel: range.comparison,
        }}
        figures={[
          { label: e.figures.perDay, value: money(perDay), info: e.figures.perDayInfo, icon: CalendarCheck, tone: "green" },
          {
            label: monthly ? e.figures.bestMonth : e.figures.bestDay,
            value: best ? money(best.usd) : "—",
            info: e.figures.bestInfo,
            hint: best ? when(best.date) : undefined,
            icon: Trophy,
            tone: "amber",
          },
          { label: e.figures.pace, value: money(perDay * 365), info: e.figures.paceInfo, hint: e.figures.atThisPace, icon: Rocket, tone: "blue" },
          {
            label: monthly ? e.figures.lastMonth : e.figures.lastDay,
            value: latest ? money(latest.usd) : "—",
            info: e.figures.lastInfo,
            hint: latest ? when(latest.date) : undefined,
            icon: Gauge,
            tone: "aqua",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4">
        <MetricBarChart
          title={monthly ? e.charts.perMonth : e.charts.perDay}
          info={e.charts.perPeriodInfo}
          label={e.charts.perPeriodLabel(range.label)}
          format="usd"
          rows={bars}
          series={[{ key: "usd", label: e.charts.series }]}
          timeAxis
          categoryLabel={t.common.chart.date}
          source="live"
        />
        <MetricChart
          title={e.charts.growth}
          info={e.charts.growthInfo}
          label={e.charts.growthLabel(range.label)}
          format="usd"
          rows={growth}
          series={[{ key: "total", label: e.charts.total }]}
          granularity={range.granularity}
          source="live"
        />
      </div>
    </div>
  );
}
