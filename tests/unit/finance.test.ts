import { describe, expect, it } from "vitest";
import { NO_GAME_LABEL, shiftMonth, summarizeFinance, usedCategories, type FinanceTransaction } from "@/features/finance/compute";
import { emptyTransaction, parseAmount, transactionSchema } from "@/features/finance/schemas";

let n = 0;
function tx(partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "type" | "category" | "amount" | "occurredOn">): FinanceTransaction {
  n += 1;
  return {
    id: `t${n}`,
    robuxAmount: null,
    description: null,
    gameId: null,
    gameName: null,
    projectId: null,
    projectName: null,
    ...partial,
  };
}

describe("shiftMonth", () => {
  it("crosses year boundaries both ways", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(shiftMonth("2026-11", -11)).toBe("2025-12");
  });
});

describe("summarizeFinance", () => {
  const today = "2026-11-26";
  const rows = [
    tx({ type: "revenue", category: "devex", amount: 1000.1, occurredOn: "2026-11-03", gameName: "Game A" }),
    tx({ type: "revenue", category: "sponsorship", amount: 500.2, occurredOn: "2026-10-15" }),
    tx({ type: "revenue", category: "roblox_payout", amount: 250, occurredOn: "2024-01-01", gameName: "Game B" }),
    tx({ type: "expense", category: "development", amount: 300, occurredOn: "2026-11-10" }),
    tx({ type: "expense", category: "advertising", amount: 120.3, occurredOn: "2026-09-02" }),
  ];
  const s = summarizeFinance(rows, today);

  it("computes all-time totals in cents", () => {
    expect(s.totalRevenue).toBe(1750.3);
    expect(s.totalExpenses).toBe(420.3);
    expect(s.profit).toBe(1330);
    expect(s.development).toBe(300);
    expect(s.advertising).toBe(120.3);
    expect(s.margin).toBeCloseTo(1330 / 1750.3);
  });

  it("splits the current and previous month", () => {
    expect(s.thisMonth).toEqual({ revenue: 1000.1, expenses: 300 });
    expect(s.previousMonth).toEqual({ revenue: 500.2, expenses: 0 });
  });

  it("returns 12 monthly buckets ending with the current month", () => {
    expect(s.monthly).toHaveLength(12);
    expect(s.monthly[0]?.month).toBe("2025-12-01");
    expect(s.monthly.at(-1)?.month).toBe("2026-11-01");
    expect(s.monthly.at(-1)?.profit).toBe(700.1);
    // The 2024 payout is outside the window but still in the totals.
    expect(s.monthly.reduce((a, m) => a + m.revenue, 0)).toBeCloseTo(1500.3);
  });

  it("groups revenue per game with unlinked revenue last", () => {
    expect(s.revenuePerGame).toEqual([
      { name: "Game A", revenue: 1000.1 },
      { name: "Game B", revenue: 250 },
      { name: NO_GAME_LABEL, revenue: 500.2 },
    ]);
  });

  it("lists only the categories used in the window, in a stable order", () => {
    expect(usedCategories(s.monthly, "revenue")).toEqual(["devex", "sponsorship"]);
    expect(usedCategories(s.monthly, "expense")).toEqual(["development", "advertising"]);
  });

  it("handles no transactions", () => {
    const empty = summarizeFinance([], today);
    expect(empty.totalRevenue).toBe(0);
    expect(empty.margin).toBeNull();
    expect(empty.revenuePerGame).toEqual([]);
  });
});

describe("transaction validation", () => {
  it("parses amounts", () => {
    expect(parseAmount("1,250.50")).toBe(1250.5);
    expect(parseAmount("$49.99")).toBe(49.99);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("12.345")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  const valid = { ...emptyTransaction, amount: "100", occurredOn: "2026-11-26" };

  it("accepts a valid revenue", () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a category that doesn't match the type", () => {
    const result = transactionSchema.safeParse({ ...valid, type: "expense", category: "devex" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["category"]);
  });

  it("rejects fractional Robux and missing dates", () => {
    expect(transactionSchema.safeParse({ ...valid, robuxAmount: "10.5" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, occurredOn: "" }).success).toBe(false);
  });
});
