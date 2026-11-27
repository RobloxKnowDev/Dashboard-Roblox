import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "@/i18n/config";

/**
 * Number, money and date formatting for one interface language.
 * Server components get theirs with `await getFormat()` (src/i18n/server.ts),
 * client components with `useFormat()` (src/i18n/client.tsx).
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: Date | string): Date {
  if (typeof value !== "string") return value;
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.345],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

function build(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const compactNumber = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const fullNumber = new Intl.NumberFormat(tag);
  const percentFormat = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 });
  const precisePercentFormat = new Intl.NumberFormat(tag, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric" });
  const shortDateFormat = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric" });
  const timeFormat = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
  // Calendar days ("2026-11-26") have no time zone: format them in UTC so they
  // never shift by a day depending on where the viewer is.
  const dayFormatUtc = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const shortDayFormatUtc = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" });
  const monthFormatUtc = new Intl.DateTimeFormat(tag, { month: "short", timeZone: "UTC" });
  const monthYearFormatUtc = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" });
  const relativeFormat = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });

  /** 1284 → "1,284" (fr: "1 284") */
  function formatNumber(value: number): string {
    return fullNumber.format(value);
  }

  /** 12_900 → "12.9K", 4_200_000 → "4.2M". Values under 10,000 stay in full. */
  function formatCompact(value: number): string {
    return Math.abs(value) < 10_000 ? fullNumber.format(value) : compactNumber.format(value);
  }

  /** Money in the studio currency. Compact above 100k: "$4.2M" (fr: "4,2 M $"). */
  function formatCurrency(
    value: number,
    options: { compact?: boolean; currency?: string; /** Show cents (exact amounts). */ cents?: boolean } = {},
  ): string {
    const { compact = Math.abs(value) >= 100_000, currency = siteConfig.currency, cents = false } = options;
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: cents && !compact ? 2 : 0,
      maximumFractionDigits: compact ? 1 : cents ? 2 : 0,
    }).format(value);
  }

  /** Robux amounts: "R$ 12.9K" */
  function formatRobux(value: number): string {
    return `R$ ${formatCompact(value)}`;
  }

  /** 0.423 → "42.3%" */
  function formatPercent(ratio: number): string {
    return percentFormat.format(ratio);
  }

  /** Small rates that need two decimals to compare: 0.00946 → "0.95%" */
  function formatPrecisePercent(ratio: number): string {
    return precisePercentFormat.format(ratio);
  }

  /** Signed delta for stat cards: 0.124 → "+12.4%" */
  function formatDelta(ratio: number): string {
    const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
    return `${sign}${percentFormat.format(Math.abs(ratio))}`;
  }

  /** "Nov 26, 2026" (fr: "26 nov. 2026") */
  function formatDate(value: Date | string): string {
    const formatter = typeof value === "string" && DATE_ONLY.test(value) ? dayFormatUtc : dateFormat;
    return formatter.format(toDate(value));
  }

  /** "Nov 26" */
  function formatShortDate(value: Date | string): string {
    const formatter = typeof value === "string" && DATE_ONLY.test(value) ? shortDayFormatUtc : shortDateFormat;
    return formatter.format(toDate(value));
  }

  /** "Nov" — month axis ticks. */
  function formatMonth(value: Date | string): string {
    return monthFormatUtc.format(toDate(value));
  }

  /** "November 2026" — month tooltips. */
  function formatMonthYear(value: Date | string): string {
    const text = monthYearFormatUtc.format(toDate(value));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** "14:05" */
  function formatTime(value: Date | string): string {
    return timeFormat.format(toDate(value));
  }

  /**
   * "3 minutes ago", "in 2 days" — relative to `now`.
   * `now` is required on purpose: with Cache Components, reading the clock during
   * prerender is an error, so callers decide where "now" comes from (request time
   * behind `connection()`, or the fixed demo reference date).
   */
  function formatRelative(value: Date | string, now: Date): string {
    let delta = (toDate(value).getTime() - now.getTime()) / 1000;
    for (const [unit, size] of RELATIVE_STEPS) {
      if (Math.abs(delta) < size) return relativeFormat.format(Math.round(delta), unit);
      delta /= size;
    }
    return formatDate(value);
  }

  return {
    locale,
    formatNumber,
    formatCompact,
    formatCurrency,
    formatRobux,
    formatPercent,
    formatPrecisePercent,
    formatDelta,
    formatDate,
    formatShortDate,
    formatMonth,
    formatMonthYear,
    formatTime,
    formatRelative,
  };
}

export type Formatters = ReturnType<typeof build>;

const cache = new Map<Locale, Formatters>();

/** Formatters for a language (built once per language). */
export function createFormat(locale: Locale): Formatters {
  let formatters = cache.get(locale);
  if (!formatters) {
    formatters = build(locale);
    cache.set(locale, formatters);
  }
  return formatters;
}

/*
 * English formatters as plain functions — for code that has no interface
 * language (cron jobs, tests, AI tool payloads). Pages use getFormat()/useFormat().
 */
const en = createFormat(DEFAULT_LOCALE);
export const {
  formatNumber,
  formatCompact,
  formatCurrency,
  formatRobux,
  formatPercent,
  formatPrecisePercent,
  formatDelta,
  formatDate,
  formatShortDate,
  formatMonth,
  formatMonthYear,
  formatTime,
  formatRelative,
} = en;

/** "Alex Martin" → "AM" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
