import { siteConfig } from "@/config/site";

const locale = siteConfig.locale;

const compactNumber = new Intl.NumberFormat(locale, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat(locale);
const percentFormat = new Intl.NumberFormat(locale, {
  style: "percent",
  maximumFractionDigits: 1,
});

/** 1284 → "1,284" */
export function formatNumber(value: number): string {
  return fullNumber.format(value);
}

/** 12_900 → "12.9K", 4_200_000 → "4.2M". Values under 10,000 stay in full. */
export function formatCompact(value: number): string {
  return Math.abs(value) < 10_000 ? fullNumber.format(value) : compactNumber.format(value);
}

/** Money in the studio currency. Compact above 100k: "$4.2M". */
export function formatCurrency(
  value: number,
  options: { compact?: boolean; currency?: string; /** Show cents (exact amounts). */ cents?: boolean } = {},
): string {
  const { compact = Math.abs(value) >= 100_000, currency = siteConfig.currency, cents = false } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: cents && !compact ? 2 : 0,
    maximumFractionDigits: compact ? 1 : cents ? 2 : 0,
  }).format(value);
}

/** Robux amounts: "R$ 12.9K" */
export function formatRobux(value: number): string {
  return `R$ ${formatCompact(value)}`;
}

/** 0.423 → "42.3%" */
export function formatPercent(ratio: number): string {
  return percentFormat.format(ratio);
}

/** Signed delta for stat cards: 0.124 → "+12.4%" */
export function formatDelta(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
  return `${sign}${percentFormat.format(Math.abs(ratio))}`;
}

const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
// Calendar days ("2026-11-26") have no time zone: format them in UTC so they
// never shift by a day depending on where the viewer is.
const dayFormatUtc = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDayFormatUtc = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
const monthFormatUtc = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
const monthYearFormatUtc = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: Date | string): Date {
  if (typeof value !== "string") return value;
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
}

/** "Nov 26, 2026" */
export function formatDate(value: Date | string): string {
  const formatter = typeof value === "string" && DATE_ONLY.test(value) ? dayFormatUtc : dateFormat;
  return formatter.format(toDate(value));
}

/** "Nov 26" */
export function formatShortDate(value: Date | string): string {
  const formatter = typeof value === "string" && DATE_ONLY.test(value) ? shortDayFormatUtc : shortDateFormat;
  return formatter.format(toDate(value));
}

/** "Nov" — month axis ticks. */
export function formatMonth(value: Date | string): string {
  return monthFormatUtc.format(toDate(value));
}

/** "November 2026" — month tooltips. */
export function formatMonthYear(value: Date | string): string {
  return monthYearFormatUtc.format(toDate(value));
}

/** "14:05" */
export function formatTime(value: Date | string): string {
  return timeFormat.format(toDate(value));
}

const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.345],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

/**
 * "3 minutes ago", "in 2 days" — relative to `now`.
 * `now` is required on purpose: with Cache Components, reading the clock during
 * prerender is an error, so callers decide where "now" comes from (request time
 * behind `connection()`, or the fixed demo reference date).
 */
export function formatRelative(value: Date | string, now: Date): string {
  let delta = (toDate(value).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) {
      return relativeFormat.format(Math.round(delta), unit);
    }
    delta /= size;
  }
  return formatDate(value);
}

/** "Alex Martin" → "AM" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
