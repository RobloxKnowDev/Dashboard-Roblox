import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

export const RANGE_OPTIONS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

export const DEFAULT_RANGE: RangeKey = "30d";

export type RangeConfig = {
  key: RangeKey;
  /** Number of points in the series. */
  points: number;
  granularity: "day" | "month";
  /** Calendar days covered. */
  days: number;
  /** Human label in the interface language: "last 30 days". */
  label: string;
  /** Delta label in the interface language: "vs previous 30 days". */
  comparison: string;
};

const CONFIGS: Record<RangeKey, RangeConfig> = {
  "7d": { key: "7d", points: 7, days: 7, granularity: "day", label: "last 7 days", comparison: "vs previous 7 days" },
  "30d": { key: "30d", points: 30, days: 30, granularity: "day", label: "last 30 days", comparison: "vs previous 30 days" },
  "90d": { key: "90d", points: 90, days: 90, granularity: "day", label: "last 90 days", comparison: "vs previous 90 days" },
  "12m": { key: "12m", points: 12, days: 365, granularity: "month", label: "last 12 months", comparison: "vs previous 12 months" },
};

/**
 * Parses ?range= safely — anything unknown falls back to the default.
 * Labels come in the interface language (pass the page's locale).
 */
export function parseRange(value: unknown, locale: Locale = DEFAULT_LOCALE): RangeConfig {
  const key = typeof value === "string" && value in CONFIGS ? (value as RangeKey) : DEFAULT_RANGE;
  return { ...CONFIGS[key], ...messages[locale].common.ranges[key] };
}
