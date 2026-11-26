import { describe, expect, it } from "vitest";
import { getDemoGameMetrics } from "@/features/overview/demo";
import { DEFAULT_RANGE, parseRange } from "@/features/overview/range";
import { formatCompact, formatDelta, formatRelative, formatShortDate } from "@/lib/utils/format";

describe("parseRange", () => {
  it("accepts known ranges", () => {
    expect(parseRange("7d").points).toBe(7);
    expect(parseRange("12m").granularity).toBe("month");
  });

  it.each([undefined, "", "1y", "<script>", ["7d"], 42])("falls back to the default for %s", (value) => {
    expect(parseRange(value).key).toBe(DEFAULT_RANGE);
  });
});

describe("formatting", () => {
  it("keeps numbers under 10,000 in full and compacts larger ones", () => {
    expect(formatCompact(9_999)).toBe("9,999");
    expect(formatCompact(12_900)).toBe("12.9K");
  });

  it("signs deltas", () => {
    expect(formatDelta(0.124)).toBe("+12.4%");
    expect(formatDelta(-0.05)).toBe("−5%");
  });

  it("formats calendar days in UTC (no off-by-one across time zones)", () => {
    expect(formatShortDate("2026-11-26")).toBe("Nov 26");
  });

  it("formats relative times against an explicit now", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(formatRelative("2026-11-26T11:57:00Z", now)).toBe("3 minutes ago");
  });
});

describe("demo data", () => {
  it("is deterministic (prerender-safe)", () => {
    const range = parseRange("30d");
    expect(getDemoGameMetrics(range)).toEqual(getDemoGameMetrics(range));
  });

  it("returns one point per period", () => {
    expect(getDemoGameMetrics(parseRange("7d")).revenue.series).toHaveLength(7);
    expect(getDemoGameMetrics(parseRange("12m")).ccu.series).toHaveLength(12);
  });
});
