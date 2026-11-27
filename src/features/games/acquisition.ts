import "server-only";
import { parseRange, type RangeConfig } from "@/features/shared/range";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getDailyBreakdown, getDailyMetric, type BreakdownResult, type DailyPoint, type MetricResult } from "@/lib/integrations/roblox/analytics";
import { getAssetImages } from "@/lib/integrations/roblox/public";
import { newAndReturning, sourceRows, thumbnailStats, type SourceRow, type ThumbnailStat } from "./acquisition-compute";
import { analyticsWindow, overallStatus, type AnalyticsStatus, type MetricSeries } from "./analytics";

/**
 * Acquisition and thumbnail analytics of one experience (Roblox Analytics).
 * Each tab of the game page loads its own data only when it is opened:
 * Roblox meters every data point (day × metric × breakdown value).
 */

/** Longest window of the Acquisition tab (12 months of daily data per source would exhaust the budget). */
const ACQUISITION_MAX_RANGE = "90d";
/** Roblox keeps thumbnail metrics for 30 days. */
const THUMBNAIL_MAX_RANGE = "30d";

const EMPTY: MetricSeries = { current: [], previous: [] };

function split(result: MetricResult, mid: string): MetricSeries {
  if (result.status !== "ok") return EMPTY;
  return { current: result.points.filter((p) => p.date >= mid), previous: result.points.filter((p) => p.date < mid) };
}

const groupsOf = (result: BreakdownResult) => (result.status === "ok" ? result.groups : []);
const failed = (...results: { status: string }[]) => results.some((r) => r.status === "error");

/** The range actually shown (labels in the interface language), and whether the requested one was shortened. */
function capRange(range: RangeConfig, max: "30d" | "90d", locale: Locale): { range: RangeConfig; capped: boolean } {
  const limit = parseRange(max, locale);
  return range.days > limit.days ? { range: limit, capped: true } : { range, capped: false };
}

/* ───────────────────────────── Acquisition ───────────────────────────── */

export type GameAcquisition = {
  status: AnalyticsStatus;
  /** Range shown (at most 90 days). */
  range: RangeConfig;
  capped: boolean;
  sources: SourceRow[];
  /** ImpressionCVR — viewers who clicked the game. */
  impressionCtr: MetricSeries;
  /** QualifiedEndToEndCVR — viewers who played a qualified session. */
  qualifiedPtr: MetricSeries;
  /** RFYPlayThroughRate — home-recommendation play-through. */
  recoPtr: DailyPoint[];
  /** RFYDuration0To60 — first plays from home recommendations ending within 60 s. */
  bounce60: MetricSeries;
  /** RFYDuration61To180 — first plays lasting 1 to 3 minutes. */
  bounce180: DailyPoint[];
  newPlayers: DailyPoint[];
  returningPlayers: DailyPoint[];
  /**
   * Blocks whose query failed (usually Roblox's rate limit): shown as
   * "couldn't load" rather than as an empty period.
   */
  failed: { sources: boolean; conversion: boolean; bounce: boolean; newReturning: boolean };
};

/** `locale`: language of the source labels and of the capped range label. */
export async function getGameAcquisition(
  universeId: number,
  requested: RangeConfig,
  today: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<GameAcquisition> {
  const { range, capped } = capRange(requested, ACQUISITION_MAX_RANGE, locale);
  const { start, mid, end } = analyticsWindow(range, today);

  // Previous period only for the three rates whose change is displayed.
  const [reached, played, ctr, qptr, reco, b60, b180, dau] = await Promise.all([
    getDailyBreakdown(universeId, "UniqueUsersWithImpressions", "AcquisitionSource", mid, end),
    getDailyBreakdown(universeId, "UniqueUsersWithPlaySessions", "AcquisitionSource", mid, end),
    getDailyMetric(universeId, "ImpressionCVR", start, end),
    getDailyMetric(universeId, "QualifiedEndToEndCVR", start, end),
    getDailyMetric(universeId, "RFYPlayThroughRate", mid, end),
    getDailyMetric(universeId, "RFYDuration0To60", start, end),
    getDailyMetric(universeId, "RFYDuration61To180", mid, end),
    getDailyBreakdown(universeId, "DailyActiveUsers", "IsNewUser", mid, end),
  ]);

  return {
    status: overallStatus([reached, played, ctr, qptr, reco, b60, b180, dau]),
    range,
    capped,
    sources: sourceRows(groupsOf(reached), groupsOf(played), messages[locale].games.acquisition.sources),
    impressionCtr: split(ctr, mid),
    qualifiedPtr: split(qptr, mid),
    recoPtr: reco.status === "ok" ? reco.points : [],
    bounce60: split(b60, mid),
    bounce180: b180.status === "ok" ? b180.points : [],
    ...newAndReturning(groupsOf(dau)),
    failed: {
      sources: failed(reached, played),
      conversion: failed(ctr, qptr, reco),
      bounce: failed(b60, b180),
      newReturning: failed(dau),
    },
  };
}

/* ───────────────────────────── Thumbnails ───────────────────────────── */

export type GameThumbnails = {
  status: AnalyticsStatus;
  /** Range shown (at most 30 days). */
  range: RangeConfig;
  capped: boolean;
  thumbnails: (ThumbnailStat & { imageUrl: string | null })[];
  /** One of the two queries failed (usually Roblox's rate limit). */
  incomplete: boolean;
};

/** `locale`: language of the capped range label. */
export async function getGameThumbnails(
  universeId: number,
  requested: RangeConfig,
  today: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<GameThumbnails> {
  const { range, capped } = capRange(requested, THUMBNAIL_MAX_RANGE, locale);
  const { mid, end } = analyticsWindow(range, today);

  const [impressions, ptr] = await Promise.all([
    getDailyBreakdown(universeId, "ThumbnailImpressions", "ThumbnailAsset", mid, end),
    getDailyBreakdown(universeId, "ThumbnailQualifiedPTR", "ThumbnailAsset", mid, end),
  ]);
  const stats = thumbnailStats(groupsOf(impressions), groupsOf(ptr));
  const images = await getAssetImages(stats.map((s) => s.assetId));

  return {
    status: overallStatus([impressions, ptr]),
    range,
    capped,
    thumbnails: stats.map((s) => ({ ...s, imageUrl: images.get(s.assetId) ?? null })),
    incomplete: failed(impressions, ptr),
  };
}
