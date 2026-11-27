import { describe, expect, it } from "vitest";
import { addSeries, dailyPayouts, payoutSeries, recentMonths, revenueChart, spreadDays, toMonthly, type PayoutRow } from "@/features/games/payouts-compute";
import { payoutFormSchema } from "@/features/games/payout-schema";
import { messages } from "@/i18n/messages";

const today = "2026-11-26";
const rows: PayoutRow[] = [
  { gameId: "g", source: "creator_rewards", month: "2026-10-01", robux: 3100 }, // 31 days → 100/day
  { gameId: "g", source: "roblox_plus", month: "2026-10-01", robux: 310 }, // → 10/day
  { gameId: "g", source: "creator_rewards", month: "2026-11-01", robux: 2500 }, // current month: 25 days elapsed → 100/day
];

describe("payout spreading", () => {
  it("spreads a past month over all its days and the current month over the days elapsed", () => {
    expect(spreadDays("2026-10-01", today)).toBe(31);
    expect(spreadDays("2026-02-01", today)).toBe(28);
    expect(spreadDays("2026-11-01", today)).toBe(25);
    expect(spreadDays("2026-11-01", "2026-11-01")).toBe(1);
  });

  it("gives a daily estimate and nothing for today or later", () => {
    const points = dailyPayouts(rows, "2026-10-30", "2026-11-28", today);
    expect(points[0]).toEqual({ date: "2026-10-30", value: 110 });
    expect(points.find((p) => p.date === "2026-11-25")?.value).toBe(100);
    expect(points.some((p) => p.date >= today)).toBe(false);
  });

  it("totals match the recorded amounts", () => {
    const october = dailyPayouts(rows, "2026-10-01", "2026-11-01", today).reduce((a, p) => a + p.value, 0);
    expect(october).toBeCloseTo(3410);
    const november = dailyPayouts(rows, "2026-11-01", today, today).reduce((a, p) => a + p.value, 0);
    expect(november).toBeCloseTo(2500);
  });

  it("builds current/previous windows and monthly buckets", () => {
    const daily = payoutSeries(rows, { start: "2026-10-01", mid: "2026-10-27", end: today }, "day", today);
    expect(daily.previous).toHaveLength(26);
    expect(daily.current.reduce((a, p) => a + p.value, 0)).toBeCloseTo(5 * 110 + 2500);
    const monthly = payoutSeries(rows, { start: "2025-11-26", mid: "2025-11-26", end: today }, "month", today);
    expect(monthly.current).toEqual(toMonthly(dailyPayouts(rows, "2025-11-26", today, today)));
    expect(monthly.current.map((p) => p.date)).toEqual(["2026-10-01", "2026-11-01"]);
    expect(monthly.previous).toEqual([]);
  });

  it("adds and charts series", () => {
    expect(addSeries([{ date: "a", value: 1 }], [{ date: "a", value: 2 }, { date: "b", value: 3 }])).toEqual([
      { date: "a", value: 3 },
      { date: "b", value: 3 },
    ]);
    expect(revenueChart([{ date: "a", value: 5 }], []).series).toHaveLength(1);
    const chart = revenueChart([{ date: "a", value: 5 }], [{ date: "b", value: 2 }]);
    expect(chart.rows).toEqual([
      { date: "a", sales: 5, rewards: 0 },
      { date: "b", sales: 0, rewards: 2 },
    ]);
    expect(chart.series.map((s) => s.label)).toEqual([messages.en.games.revenueChart.sales, messages.en.games.revenueChart.rewards]);
    const fr = revenueChart([{ date: "a", value: 5 }], [{ date: "b", value: 2 }], messages.fr.games.revenueChart);
    expect(fr.series.map((s) => s.label)).toEqual([messages.fr.games.revenueChart.sales, messages.fr.games.revenueChart.rewards]);
  });

  it("lists the last 12 months, current first", () => {
    const months = recentMonths(today);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-11-01");
    expect(months[11]).toBe("2025-12-01");
  });
});

describe("payout form", () => {
  it("validates month and whole Robux", () => {
    expect(payoutFormSchema.safeParse({ month: "2026-10", creatorRewards: "12500", robloxPlus: "" }).success).toBe(true);
    expect(payoutFormSchema.safeParse({ month: "2026-13", creatorRewards: "1", robloxPlus: "" }).success).toBe(false);
    expect(payoutFormSchema.safeParse({ month: "2026-10", creatorRewards: "12.5", robloxPlus: "" }).success).toBe(false);
    expect(payoutFormSchema.safeParse({ month: "2019-12", creatorRewards: "1", robloxPlus: "" }).success).toBe(false);
  });
});
