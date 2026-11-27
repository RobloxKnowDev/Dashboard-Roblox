import { Coins, Megaphone, PiggyBank, Receipt, TrendingUp, Wallet, Wrench } from "lucide-react";
import { connection } from "next/server";
import { SERIES_COLORS } from "@/components/charts/theme";
import { StatCard } from "@/components/data/stat-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getStudioMetrics } from "@/features/overview/studio";
import { MetricBarChart, MetricChart } from "@/features/shared/metric-chart";
import { INTL_LOCALE } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getI18n, getT } from "@/i18n/server";
import type { Formatters } from "@/lib/utils/format";
import { TransactionsTable } from "./components";
import { NO_GAME_LABEL, summarizeFinance, usedCategories, type FinanceSummary } from "./compute";
import { getFinanceFormOptions, listTransactions } from "./data";
import { CATEGORIES_BY_TYPE, type TransactionType } from "./schemas";
import { TransactionFormModal } from "./transaction-form";

/*
 * LIVE: Finance is built only from the transactions the team records.
 * Roblox analytics earnings are shown apart, as an estimate, and are never
 * added to these totals (payouts are recorded as transactions when received).
 */

async function todayIso() {
  await connection();
  return new Date().toISOString().slice(0, 10);
}

async function loadSummary(): Promise<{ summary: FinanceSummary; today: string } | null> {
  const [transactions, today] = await Promise.all([listTransactions(), todayIso()]);
  return transactions ? { summary: summarizeFinance(transactions, today), today } : null;
}

function LoadError({ t }: { t: Messages }) {
  return <ErrorState description={t.finance.page.loadError} />;
}

/* ─────────────────────────────── KPIs ─────────────────────────────── */

export async function FinanceKpis() {
  const [data, { t, f }] = await Promise.all([loadSummary(), getI18n()]);
  if (!data) return <LoadError t={t} />;
  const { summary: s, today } = data;
  const k = t.finance.kpis;
  const usd = (value: number) => f.formatCurrency(value);
  const shareOf = (part: number, total: number) => (total > 0 ? k.shareOfExpenses(f.formatPercent(part / total)) : k.noExpenses);
  const trend = (key: "revenue" | "expenses" | "profit") => s.monthly.map((m) => m[key]);
  const empty = s.count === 0 ? k.noTransactions : undefined;
  const previous = s.previousMonth.revenue;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      <StatCard label={k.totalRevenue} value={usd(s.totalRevenue)} source="live" icon={Wallet} hint={empty ?? k.allTime} trend={trend("revenue")} />
      <StatCard
        label={k.monthlyRevenue}
        value={usd(s.thisMonth.revenue)}
        source="live"
        icon={Coins}
        delta={previous > 0 ? s.thisMonth.revenue / previous - 1 : undefined}
        deltaLabel={k.vsLastMonth}
        hint={f.formatMonthYear(`${today.slice(0, 7)}-01`)}
      />
      <StatCard
        label={k.totalExpenses}
        value={usd(s.totalExpenses)}
        source="live"
        icon={Receipt}
        upIsGood={false}
        hint={empty ?? k.thisMonth(usd(s.thisMonth.expenses))}
        trend={trend("expenses")}
      />
      <StatCard label={k.development} value={usd(s.development)} source="live" icon={Wrench} hint={shareOf(s.development, s.totalExpenses)} />
      <StatCard label={k.advertising} value={usd(s.advertising)} source="live" icon={Megaphone} hint={shareOf(s.advertising, s.totalExpenses)} />
      <StatCard
        label={k.profit}
        value={usd(s.profit)}
        source="live"
        icon={PiggyBank}
        hint={s.margin === null ? k.profitHint : k.profitHintMargin(f.formatPercent(s.margin))}
        trend={trend("profit")}
      />
    </div>
  );
}

/* ─────────────────────────────── Charts ─────────────────────────────── */

/** Stacked monthly bars by category; colors follow the category, not its position. */
function categoryHistory(s: FinanceSummary, type: TransactionType, t: Messages, f: Formatters) {
  const categories = usedCategories(s.monthly, type);
  const series = categories.map((c) => ({
    key: c,
    label: t.finance.categories[c],
    color: SERIES_COLORS[CATEGORIES_BY_TYPE[type].indexOf(c)] ?? SERIES_COLORS[0],
  }));
  const rows = categories.length
    ? s.monthly.map((m) => ({ category: f.formatMonth(m.month), ...Object.fromEntries(categories.map((c) => [c, m.byCategory[type][c] ?? 0])) }))
    : [];
  return { rows, series };
}

export async function FinanceCharts() {
  const [data, { t, f }] = await Promise.all([loadSummary(), getI18n()]);
  if (!data) return <LoadError t={t} />;
  const s = data.summary;
  const c = t.finance.charts;
  const revenue = categoryHistory(s, "revenue", t, f);
  const expenses = categoryHistory(s, "expense", t, f);
  const hasActivity = s.monthly.some((m) => m.revenue > 0 || m.expenses > 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <MetricBarChart
        title={c.revenueTitle}
        description={c.revenueDescription}
        label={c.revenueDescription}
        source="live"
        format="usd"
        stacked
        categoryLabel={c.month}
        rows={revenue.rows}
        series={revenue.series}
        emptyMessage={c.revenueEmpty}
      />
      <MetricBarChart
        title={c.expensesTitle}
        description={c.expensesDescription}
        label={c.expensesDescription}
        source="live"
        format="usd"
        stacked
        categoryLabel={c.month}
        rows={expenses.rows}
        series={expenses.series}
        emptyMessage={c.expensesEmpty}
      />
      <MetricChart
        title={c.profitTitle}
        description={c.profitDescription}
        label={c.profitLabel}
        source="live"
        format="usd"
        granularity="month"
        variant="line"
        rows={hasActivity ? s.monthly.map((m) => ({ date: m.month, profit: m.profit })) : []}
        series={[{ key: "profit", label: c.profitSeries }]}
        emptyMessage={c.profitEmpty}
      />
      <MetricBarChart
        title={c.perGameTitle}
        description={c.perGameDescription}
        label={c.perGameLabel}
        source="live"
        format="usd"
        categoryLabel={c.game}
        rows={s.revenuePerGame.map((g) => ({ category: g.name === NO_GAME_LABEL ? c.noGame : g.name, revenue: g.revenue }))}
        series={[{ key: "revenue", label: c.perGameSeries }]}
        emptyMessage={c.perGameEmpty}
      />
    </div>
  );
}

/* ─────────────────────── Roblox earnings (estimate) ─────────────────────── */

export async function RobloxEarnings() {
  const [studio, { t, f, locale }] = await Promise.all([todayIso().then(async (today) => getStudioMetrics("30d", today, (await getI18n()).locale)), getI18n()]);
  const e = t.finance.earnings;

  let body;
  if (studio.status === "error") {
    body = <p className="text-sm text-fg-3">{e.gamesError}</p>;
  } else if (studio.status === "no_games" || studio.analyticsCount === 0) {
    body = <p className="text-sm text-fg-3">{studio.status === "no_games" ? e.noGames : e.noAnalytics}</p>;
  } else {
    const robux = studio.revenue.total;
    // The DevEx rate has up to 4+ decimals ($0.0038): no rounding to cents.
    const rate = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: siteConfig.currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 6,
    }).format(studio.devexRate);
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={e.robuxEarned}
          value={f.formatRobux(robux)}
          source="live"
          icon={TrendingUp}
          hint={
            studio.revenue.rewards > 0
              ? e.robuxHintRewards(f.formatRobux(studio.revenue.rewards))
              : e.robuxHintGames(studio.analyticsCount, studio.gameCount)
          }
          trend={studio.revenue.series.map((p) => p.value)}
        />
        <StatCard label={e.devexValue} value={`≈ ${f.formatCurrency(robux * studio.devexRate)}`} source="live" icon={Coins} hint={e.devexHint(rate)} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title={e.title} description={e.description} />
      <CardBody>{body}</CardBody>
    </Card>
  );
}

/* ─────────────────────────────── Transactions ─────────────────────────────── */

export async function AddTransactionAction() {
  return <TransactionFormModal options={await getFinanceFormOptions()} />;
}

export async function TransactionsSection() {
  const [transactions, options, t] = await Promise.all([listTransactions(), getFinanceFormOptions(), getT()]);
  if (!transactions) return <LoadError t={t} />;
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Receipt}
          title={t.finance.table.emptyTitle}
          description={t.finance.table.emptyDescription}
          action={<TransactionFormModal options={options} />}
        />
      </div>
    );
  }
  return <TransactionsTable transactions={transactions} options={options} />;
}
