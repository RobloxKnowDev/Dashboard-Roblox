import { Coins, Megaphone, PiggyBank, Receipt, TrendingUp, Wallet, Wrench } from "lucide-react";
import { connection } from "next/server";
import { SERIES_COLORS } from "@/components/charts/theme";
import { StatCard } from "@/components/data/stat-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getStudioMetrics } from "@/features/overview/studio";
import { MetricBarChart, MetricChart } from "@/features/shared/metric-chart";
import { formatCurrency, formatMonth, formatMonthYear, formatPercent, formatRobux } from "@/lib/utils/format";
import { TransactionsTable } from "./components";
import { summarizeFinance, usedCategories, type FinanceSummary } from "./compute";
import { getFinanceFormOptions, listTransactions } from "./data";
import { CATEGORIES_BY_TYPE, CATEGORY_LABELS, type TransactionType } from "./schemas";
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

const usd = (value: number) => formatCurrency(value);
const shareOf = (part: number, total: number) => (total > 0 ? `${formatPercent(part / total)} of expenses` : "No expenses yet");
const loadError = <ErrorState description="Finances couldn't be loaded. Refresh the page to try again." />;

/* ─────────────────────────────── KPIs ─────────────────────────────── */

export async function FinanceKpis() {
  const data = await loadSummary();
  if (!data) return loadError;
  const { summary: s, today } = data;
  const trend = (key: "revenue" | "expenses" | "profit") => s.monthly.map((m) => m[key]);
  const empty = s.count === 0 ? "No transactions yet" : undefined;
  const previous = s.previousMonth.revenue;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Total revenue" value={usd(s.totalRevenue)} source="live" icon={Wallet} hint={empty ?? "All time"} trend={trend("revenue")} />
      <StatCard
        label="Monthly revenue"
        value={usd(s.thisMonth.revenue)}
        source="live"
        icon={Coins}
        delta={previous > 0 ? s.thisMonth.revenue / previous - 1 : undefined}
        deltaLabel="vs last month"
        hint={formatMonthYear(`${today.slice(0, 7)}-01`)}
      />
      <StatCard
        label="Total expenses"
        value={usd(s.totalExpenses)}
        source="live"
        icon={Receipt}
        upIsGood={false}
        hint={empty ?? `This month: ${usd(s.thisMonth.expenses)}`}
        trend={trend("expenses")}
      />
      <StatCard label="Development costs" value={usd(s.development)} source="live" icon={Wrench} hint={shareOf(s.development, s.totalExpenses)} />
      <StatCard label="Advertising costs" value={usd(s.advertising)} source="live" icon={Megaphone} hint={shareOf(s.advertising, s.totalExpenses)} />
      <StatCard
        label="Estimated profit"
        value={usd(s.profit)}
        source="live"
        icon={PiggyBank}
        hint={s.margin === null ? "Revenue minus expenses" : `Margin ${formatPercent(s.margin)} · revenue minus expenses`}
        trend={trend("profit")}
      />
    </div>
  );
}

/* ─────────────────────────────── Charts ─────────────────────────────── */

/** Stacked monthly bars by category; colors follow the category, not its position. */
function categoryHistory(s: FinanceSummary, type: TransactionType) {
  const categories = usedCategories(s.monthly, type);
  const series = categories.map((c) => ({
    key: c,
    label: CATEGORY_LABELS[c],
    color: SERIES_COLORS[CATEGORIES_BY_TYPE[type].indexOf(c)] ?? SERIES_COLORS[0],
  }));
  const rows = categories.length
    ? s.monthly.map((m) => ({ category: formatMonth(m.month), ...Object.fromEntries(categories.map((c) => [c, m.byCategory[type][c] ?? 0])) }))
    : [];
  return { rows, series };
}

export async function FinanceCharts() {
  const data = await loadSummary();
  if (!data) return loadError;
  const s = data.summary;
  const revenue = categoryHistory(s, "revenue");
  const expenses = categoryHistory(s, "expense");
  const hasActivity = s.monthly.some((m) => m.revenue > 0 || m.expenses > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <MetricBarChart
        title="Revenue history"
        description="Revenue per month by category, last 12 months"
        label="Revenue per month by category, last 12 months"
        source="live"
        format="usd"
        stacked
        categoryLabel="Month"
        rows={revenue.rows}
        series={revenue.series}
        emptyMessage="Record revenue transactions to build the history."
      />
      <MetricBarChart
        title="Expenses history"
        description="Expenses per month by category, last 12 months"
        label="Expenses per month by category, last 12 months"
        source="live"
        format="usd"
        stacked
        categoryLabel="Month"
        rows={expenses.rows}
        series={expenses.series}
        emptyMessage="Record expense transactions to build the history."
      />
      <MetricChart
        title="Profit history"
        description="Revenue minus expenses per month, last 12 months"
        label="Profit per month, last 12 months"
        source="live"
        format="usd"
        granularity="month"
        variant="line"
        rows={hasActivity ? s.monthly.map((m) => ({ date: m.month, profit: m.profit })) : []}
        series={[{ key: "profit", label: "Profit" }]}
        emptyMessage="Profit appears once revenue or expenses are recorded."
      />
      <MetricBarChart
        title="Revenue per game"
        description="All-time revenue by linked game"
        label="All-time revenue per game"
        source="live"
        format="usd"
        categoryLabel="Game"
        rows={s.revenuePerGame.map((g) => ({ category: g.name, revenue: g.revenue }))}
        series={[{ key: "revenue", label: "Revenue" }]}
        emptyMessage="Link revenue transactions to a game to compare them."
      />
    </div>
  );
}

/* ─────────────────────── Roblox earnings (estimate) ─────────────────────── */

export async function RobloxEarnings() {
  const studio = await getStudioMetrics("30d", await todayIso());

  let body;
  if (studio.status === "error") {
    body = <p className="text-sm text-fg-3">Your games couldn&apos;t be loaded. Refresh the page to try again.</p>;
  } else if (studio.status === "no_games" || studio.analyticsCount === 0) {
    body = (
      <p className="text-sm text-fg-3">
        {studio.status === "no_games"
          ? "Add your games in My Games to see the Robux they earn."
          : "None of your games can be read with the Roblox API keys yet."}
      </p>
    );
  } else {
    const robux = studio.revenue.total;
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Robux earned"
          value={formatRobux(robux)}
          source="live"
          icon={TrendingUp}
          hint={`Last 30 days · ${studio.analyticsCount} of ${studio.gameCount} games`}
          trend={studio.revenue.series.map((p) => p.value)}
        />
        <StatCard
          label="DevEx value"
          value={`≈ ${formatCurrency(robux * studio.devexRate)}`}
          source="live"
          icon={Coins}
          hint={`At $${studio.devexRate} per Robux (Settings → General)`}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Roblox earnings — estimate"
        description="From Roblox analytics. Not included in the totals above: record payouts as revenue when you receive them."
      />
      <CardBody>{body}</CardBody>
    </Card>
  );
}

/* ─────────────────────────────── Transactions ─────────────────────────────── */

export async function AddTransactionAction() {
  return <TransactionFormModal options={await getFinanceFormOptions()} />;
}

export async function TransactionsSection() {
  const [transactions, options] = await Promise.all([listTransactions(), getFinanceFormOptions()]);
  if (!transactions) return loadError;
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Record payouts, DevEx, sponsorships and expenses to build your revenue, cost and profit figures."
          action={<TransactionFormModal options={options} />}
        />
      </div>
    );
  }
  return <TransactionsTable transactions={transactions} options={options} />;
}
