import { CATEGORIES_BY_TYPE, type TransactionCategory, type TransactionType } from "./schemas";

/*
 * Pure finance aggregation (unit-tested). Every figure comes from the manual
 * transactions — nothing here is estimated or mixed with Roblox analytics.
 */

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  robuxAmount: number | null;
  occurredOn: string;
  description: string | null;
  gameId: string | null;
  gameName: string | null;
  projectId: string | null;
  projectName: string | null;
};

export type MonthBucket = {
  /** First day of the month, "2026-11-01". */
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  byCategory: { revenue: Partial<Record<TransactionCategory, number>>; expense: Partial<Record<TransactionCategory, number>> };
};

export type FinanceSummary = {
  count: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  /** Profit / revenue, null without revenue. */
  margin: number | null;
  development: number;
  advertising: number;
  thisMonth: { revenue: number; expenses: number };
  previousMonth: { revenue: number; expenses: number };
  /** Oldest → newest, always `months` buckets ending with the current month. */
  monthly: MonthBucket[];
  /** All-time revenue per linked game, highest first ("No game" last). */
  revenuePerGame: { name: string; revenue: number }[];
};

export const NO_GAME_LABEL = "Not linked to a game";

/** "2026-11" shifted by n months → "2026-08". */
export function shiftMonth(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Rounds to cents so float sums never show 0.30000000000000004. */
const cents = (value: number) => Math.round(value * 100) / 100;

export function summarizeFinance(transactions: FinanceTransaction[], today: string, months = 12): FinanceSummary {
  const currentMonth = today.slice(0, 7);
  const previousMonth = shiftMonth(currentMonth, -1);
  const firstMonth = shiftMonth(currentMonth, -(months - 1));

  const buckets = new Map<string, MonthBucket>();
  for (let i = 0; i < months; i++) {
    const ym = shiftMonth(firstMonth, i);
    buckets.set(ym, { month: `${ym}-01`, revenue: 0, expenses: 0, profit: 0, byCategory: { revenue: {}, expense: {} } });
  }

  let totalRevenue = 0;
  let totalExpenses = 0;
  let development = 0;
  let advertising = 0;
  const perGame = new Map<string, number>();

  for (const t of transactions) {
    const ym = t.occurredOn.slice(0, 7);
    const bucket = buckets.get(ym);
    if (t.type === "revenue") {
      totalRevenue += t.amount;
      const key = t.gameName ?? NO_GAME_LABEL;
      perGame.set(key, (perGame.get(key) ?? 0) + t.amount);
      if (bucket) {
        bucket.revenue += t.amount;
        bucket.byCategory.revenue[t.category] = (bucket.byCategory.revenue[t.category] ?? 0) + t.amount;
      }
    } else {
      totalExpenses += t.amount;
      if (t.category === "development") development += t.amount;
      if (t.category === "advertising") advertising += t.amount;
      if (bucket) {
        bucket.expenses += t.amount;
        bucket.byCategory.expense[t.category] = (bucket.byCategory.expense[t.category] ?? 0) + t.amount;
      }
    }
  }

  const monthly = [...buckets.values()].map((b) => ({
    ...b,
    revenue: cents(b.revenue),
    expenses: cents(b.expenses),
    profit: cents(b.revenue - b.expenses),
  }));
  const pick = (ym: string) => {
    const b = buckets.get(ym);
    if (b) return { revenue: cents(b.revenue), expenses: cents(b.expenses) };
    // Previous month outside the window (months = 1): compute directly.
    const inMonth = transactions.filter((t) => t.occurredOn.startsWith(ym));
    const sum = (type: TransactionType) => cents(inMonth.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0));
    return { revenue: sum("revenue"), expenses: sum("expense") };
  };

  const revenuePerGame = [...perGame.entries()]
    .map(([name, revenue]) => ({ name, revenue: cents(revenue) }))
    .sort((a, b) => (a.name === NO_GAME_LABEL ? 1 : b.name === NO_GAME_LABEL ? -1 : b.revenue - a.revenue));

  const profit = cents(totalRevenue - totalExpenses);
  return {
    count: transactions.length,
    totalRevenue: cents(totalRevenue),
    totalExpenses: cents(totalExpenses),
    profit,
    margin: totalRevenue > 0 ? profit / totalRevenue : null,
    development: cents(development),
    advertising: cents(advertising),
    thisMonth: pick(currentMonth),
    previousMonth: pick(previousMonth),
    monthly,
    revenuePerGame,
  };
}

/** Categories of a type that have at least one value in the window (stable order). */
export function usedCategories(monthly: MonthBucket[], type: TransactionType): TransactionCategory[] {
  return CATEGORIES_BY_TYPE[type].filter((category) => monthly.some((m) => (m.byCategory[type][category] ?? 0) > 0));
}
