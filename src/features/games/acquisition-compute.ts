import { SERIES_COLORS } from "@/components/charts/theme";
import { messages, type Messages } from "@/i18n/messages";
import type { BreakdownGroup, DailyPoint } from "@/lib/integrations/roblox/analytics";

/**
 * Pure helpers for the Acquisition and Thumbnails tabs of a game page
 * (no I/O — unit tested).
 */

/* ───────────────────────────── Sources ───────────────────────────── */

/**
 * Known AcquisitionSource values, each with a fixed color so a source keeps
 * its color across games and periods. Values seen from the API; anything else
 * Roblox adds later is labelled from its name. Labels come from the
 * dictionary (t.games.acquisition.sources), English by default.
 */
type KnownSource = "HomeRecommendation" | "Search" | "ContinueToPlay" | "Friends" | "SponsoredAds";
const KNOWN_SOURCES: Record<KnownSource, { color: string }> = {
  HomeRecommendation: { color: SERIES_COLORS[0] },
  Search: { color: SERIES_COLORS[1] },
  ContinueToPlay: { color: SERIES_COLORS[2] },
  Friends: { color: SERIES_COLORS[3] },
  SponsoredAds: { color: SERIES_COLORS[4] },
};

export type SourceLabels = Messages["games"]["acquisition"]["sources"];
const EN_SOURCE_LABELS: SourceLabels = messages.en.games.acquisition.sources;

const isKnown = (raw: string): raw is KnownSource => Object.hasOwn(KNOWN_SOURCES, raw);

/** Colors left for sources the dashboard doesn't know yet (by volume). */
const SPARE_COLORS = [SERIES_COLORS[5], SERIES_COLORS[7]];
const OTHER_KEY = "Others";
const OTHER_COLOR = SERIES_COLORS[6];

/** "TodaysPicks" → "Todays picks" (unknown Roblox values are humanized, not translated). */
export function sourceLabel(raw: string, labels: SourceLabels = EN_SOURCE_LABELS): string {
  if (isKnown(raw)) return labels[raw];
  if (raw === OTHER_KEY || raw === "") return labels.other;
  const words = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const sumPoints = (points: DailyPoint[]) => points.reduce((acc, p) => acc + p.value, 0);

/** Adds several daily series together, date by date. */
export function mergePoints(series: DailyPoint[][]): DailyPoint[] {
  const byDate = new Map<string, number>();
  for (const points of series) for (const p of points) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.value);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

export type SourceRow = {
  /** Stable series key (the raw dimension value, or "Others"). */
  key: string;
  label: string;
  color: string;
  /** Daily unique players who saw the game from this source. */
  reached: DailyPoint[];
  /** Daily unique players who started a session from this source. */
  played: DailyPoint[];
  reachedTotal: number;
  playedTotal: number;
  /**
   * played / reached. Null when there's nothing to compare, or when plays
   * exceed impressions (sessions that don't start from an impression:
   * links, teleports…) — a ratio above 100% would mislead.
   */
  playRate: number | null;
};

/**
 * Joins the "reached" and "played" breakdowns per acquisition source.
 * Known sources keep their own row; at most two unknown sources get one
 * (by volume); everything else, including Roblox's own "Others", is merged
 * into "Other" — never more than 8 series. Sorted by reach, "Other" last.
 */
export function sourceRows(reached: BreakdownGroup[], played: BreakdownGroup[], labels: SourceLabels = EN_SOURCE_LABELS): SourceRow[] {
  const keys = new Set([...reached.map((g) => g.value), ...played.map((g) => g.value)]);
  const pointsOf = (groups: BreakdownGroup[], key: string) => groups.find((g) => g.value === key)?.points ?? [];
  const volume = (key: string) => sumPoints(pointsOf(reached, key)) + sumPoints(pointsOf(played, key));

  const unknown = [...keys]
    .filter((k) => !isKnown(k) && k !== OTHER_KEY && k !== "")
    .sort((a, b) => volume(b) - volume(a) || a.localeCompare(b));
  const own = new Map<string, string>(); // key → color
  for (const k of keys) {
    if (isKnown(k)) own.set(k, KNOWN_SOURCES[k].color);
  }
  unknown.slice(0, SPARE_COLORS.length).forEach((k, i) => own.set(k, SPARE_COLORS[i] ?? OTHER_COLOR));
  const merged = [...keys].filter((k) => !own.has(k));

  const row = (key: string, label: string, color: string, r: DailyPoint[], p: DailyPoint[]): SourceRow => {
    const reachedTotal = sumPoints(r);
    const playedTotal = sumPoints(p);
    return {
      key,
      label,
      color,
      reached: r,
      played: p,
      reachedTotal,
      playedTotal,
      playRate: reachedTotal > 0 && playedTotal <= reachedTotal ? playedTotal / reachedTotal : null,
    };
  };

  const rows = [...own.entries()].map(([key, color]) => row(key, sourceLabel(key, labels), color, pointsOf(reached, key), pointsOf(played, key)));
  rows.sort((a, b) => b.reachedTotal - a.reachedTotal || b.playedTotal - a.playedTotal || a.label.localeCompare(b.label));
  if (merged.length > 0) {
    rows.push(
      row(
        OTHER_KEY,
        labels.other,
        OTHER_COLOR,
        mergePoints(merged.map((k) => pointsOf(reached, k))),
        mergePoints(merged.map((k) => pointsOf(played, k))),
      ),
    );
  }
  return rows;
}

/* ──────────────────────────── New vs returning ──────────────────────────── */

/** Splits DailyActiveUsers broken down by IsNewUser ("New" / "Returning"). */
export function newAndReturning(groups: BreakdownGroup[]): { newPlayers: DailyPoint[]; returningPlayers: DailyPoint[] } {
  return {
    newPlayers: groups.find((g) => g.value === "New")?.points ?? [],
    returningPlayers: groups.find((g) => g.value === "Returning")?.points ?? [],
  };
}

/* ───────────────────────────── Thumbnails ───────────────────────────── */

export type ThumbnailStat = {
  assetId: string;
  /** 1 = most impressions over the period. */
  rank: number;
  color: string;
  impressions: number;
  /** Share of all thumbnail impressions over the period, 0–1. */
  share: number;
  /** Qualified play-through rate weighted by daily impressions, or null. */
  qualifiedPtr: number | null;
  /** Daily impressions. */
  daily: DailyPoint[];
};

/** Thumbnails drawn as their own series; the rest are merged. */
export const MAX_THUMBNAIL_SERIES = 7;

/**
 * Per-thumbnail totals from ThumbnailImpressions and ThumbnailQualifiedPTR
 * (both broken down by ThumbnailAsset), most impressions first.
 */
export function thumbnailStats(impressions: BreakdownGroup[], ptr: BreakdownGroup[]): ThumbnailStat[] {
  const total = impressions.reduce((acc, g) => acc + sumPoints(g.points), 0);
  const stats = impressions
    .filter((g) => g.value !== "")
    .map((g) => {
      const imps = sumPoints(g.points);
      const rates = new Map((ptr.find((p) => p.value === g.value)?.points ?? []).map((p) => [p.date, p.value]));
      let weighted = 0;
      let weight = 0;
      for (const p of g.points) {
        const rate = rates.get(p.date);
        if (rate === undefined || p.value <= 0) continue;
        weighted += rate * p.value;
        weight += p.value;
      }
      return {
        assetId: g.value,
        impressions: imps,
        share: total > 0 ? imps / total : 0,
        qualifiedPtr: weight > 0 ? weighted / weight : null,
        daily: g.points,
      };
    })
    .sort((a, b) => b.impressions - a.impressions || a.assetId.localeCompare(b.assetId));

  return stats.map((s, i) => ({
    ...s,
    rank: i + 1,
    color: i < MAX_THUMBNAIL_SERIES ? (SERIES_COLORS[i] ?? OTHER_COLOR) : OTHER_COLOR,
  }));
}

/** Impression-weighted qualified play-through across thumbnails. */
export function overallQualifiedPtr(stats: ThumbnailStat[]): number | null {
  let weighted = 0;
  let weight = 0;
  for (const s of stats) {
    if (s.qualifiedPtr === null || s.impressions <= 0) continue;
    weighted += s.qualifiedPtr * s.impressions;
    weight += s.impressions;
  }
  return weight > 0 ? weighted / weight : null;
}

/**
 * The thumbnail that converts best, among those with a meaningful sample
 * (≥ 5% of impressions and ≥ 200 impressions), or null.
 */
export function bestThumbnail(stats: ThumbnailStat[]): ThumbnailStat | null {
  const eligible = stats.filter((s) => s.qualifiedPtr !== null && s.share >= 0.05 && s.impressions >= 200);
  if (eligible.length < 2) return null;
  return eligible.reduce((best, s) => ((s.qualifiedPtr ?? 0) > (best.qualifiedPtr ?? 0) ? s : best));
}
