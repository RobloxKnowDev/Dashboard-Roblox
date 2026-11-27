import { describe, expect, it } from "vitest";
import { SERIES_COLORS } from "@/components/charts/theme";
import {
  bestThumbnail,
  mergePoints,
  newAndReturning,
  overallQualifiedPtr,
  sourceLabel,
  sourceRows,
  thumbnailStats,
} from "@/features/games/acquisition-compute";
import { parseGameTab } from "@/features/games/tabs";
import type { BreakdownGroup } from "@/lib/integrations/roblox/analytics";

const pts = (...values: number[]) => values.map((value, i) => ({ date: `2026-11-0${i + 1}`, value }));
const group = (value: string, ...values: number[]): BreakdownGroup => ({ value, points: pts(...values) });

describe("acquisition sources", () => {
  it("labels known sources and humanizes new ones", () => {
    expect(sourceLabel("HomeRecommendation")).toBe("Home recommendations");
    expect(sourceLabel("ContinueToPlay")).toBe("Continue playing");
    expect(sourceLabel("Others")).toBe("Other");
    expect(sourceLabel("TodaysPicks")).toBe("Todays picks");
  });

  it("joins reach and plays per source, sorted by reach, with a stable color per source", () => {
    const rows = sourceRows(
      [group("HomeRecommendation", 100, 100), group("Search", 300, 300)],
      [group("Search", 10, 20), group("HomeRecommendation", 5, 5)],
    );
    expect(rows.map((r) => r.key)).toEqual(["Search", "HomeRecommendation"]);
    expect(rows[0]).toMatchObject({ reachedTotal: 600, playedTotal: 30, playRate: 0.05, color: SERIES_COLORS[1] });
    expect(rows[1]).toMatchObject({ reachedTotal: 200, playedTotal: 10, playRate: 0.05, color: SERIES_COLORS[0] });
  });

  it("hides the play rate when plays exceed impressions (links, teleports)", () => {
    const [row] = sourceRows([group("Friends", 10)], [group("Friends", 40)]);
    expect(row?.playRate).toBeNull();
    const [none] = sourceRows([], [group("Friends", 4)]);
    expect(none?.playRate).toBeNull();
  });

  it("keeps two unknown sources and merges the rest with Roblox's Others, last", () => {
    const rows = sourceRows(
      [group("Search", 50), group("Others", 3), group("A", 30), group("B", 20), group("C", 10)],
      [group("Others", 7), group("C", 1)],
    );
    expect(rows.map((r) => r.key)).toEqual(["Search", "A", "B", "Others"]);
    const other = rows.at(-1);
    expect(other).toMatchObject({ label: "Other", reachedTotal: 13, playedTotal: 8 });
    expect(new Set(rows.map((r) => r.color)).size).toBe(rows.length);
  });

  it("adds series date by date", () => {
    expect(mergePoints([pts(1, 2), [{ date: "2026-11-02", value: 3 }]])).toEqual([
      { date: "2026-11-01", value: 1 },
      { date: "2026-11-02", value: 5 },
    ]);
  });

  it("splits daily users into new and returning", () => {
    const split = newAndReturning([group("Returning", 9), group("New", 35)]);
    expect(split.newPlayers).toEqual(pts(35));
    expect(split.returningPlayers).toEqual(pts(9));
    expect(newAndReturning([])).toEqual({ newPlayers: [], returningPlayers: [] });
  });
});

describe("thumbnail stats", () => {
  const impressions = [group("111", 100, 300), group("222", 600, 1000), group("333", 0, 0)];
  const ptr = [group("111", 0.02, 0.01), group("222", 0.01, 0.005)];

  it("ranks thumbnails by impressions with shares and impression-weighted play-through", () => {
    const stats = thumbnailStats(impressions, ptr);
    expect(stats.map((s) => [s.assetId, s.rank])).toEqual([
      ["222", 1],
      ["111", 2],
      ["333", 3],
    ]);
    expect(stats[0]?.share).toBeCloseTo(0.8);
    // (600×0.01 + 1000×0.005) / 1600
    expect(stats[0]?.qualifiedPtr).toBeCloseTo(11 / 1600);
    // (100×0.02 + 300×0.01) / 400
    expect(stats[1]?.qualifiedPtr).toBeCloseTo(5 / 400);
    expect(stats[2]?.qualifiedPtr).toBeNull();
    expect(stats[0]?.color).toBe(SERIES_COLORS[0]);
  });

  it("weights the overall rate by impressions", () => {
    expect(overallQualifiedPtr(thumbnailStats(impressions, ptr))).toBeCloseTo(16 / 2000);
    expect(overallQualifiedPtr([])).toBeNull();
  });

  it("names a best thumbnail only among thumbnails with enough impressions", () => {
    expect(bestThumbnail(thumbnailStats(impressions, ptr))?.assetId).toBe("111");
    // A single eligible thumbnail is not a comparison.
    expect(bestThumbnail(thumbnailStats([group("1", 5000)], [group("1", 0.01)]))).toBeNull();
    // Too few impressions to judge.
    expect(bestThumbnail(thumbnailStats([group("1", 100), group("2", 90)], [group("1", 0.1), group("2", 0.2)]))).toBeNull();
  });
});

describe("game tabs", () => {
  it("falls back to performance for anything unknown", () => {
    expect(parseGameTab("acquisition")).toBe("acquisition");
    expect(parseGameTab("thumbnails")).toBe("thumbnails");
    expect(parseGameTab("ads")).toBe("performance");
    expect(parseGameTab(undefined)).toBe("performance");
  });
});
