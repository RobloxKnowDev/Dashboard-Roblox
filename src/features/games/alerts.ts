import { INTL_LOCALE, LOCALES } from "@/i18n/config";
import { messages, type Messages } from "@/i18n/messages";
import type { DailyPoint } from "@/lib/integrations/roblox/analytics";

export type GameAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
};

type AlertInput = {
  gameName: string;
  dau: { current: DailyPoint[]; previous: DailyPoint[] };
  revenue: { current: DailyPoint[] };
  d1: { current: DailyPoint[] };
};

const avg = (points: DailyPoint[]) => (points.length ? points.reduce((a, p) => a + p.value, 0) / points.length : null);
const sum = (points: DailyPoint[]) => points.reduce((a, p) => a + p.value, 0);

/** "40.0%" (fr: "40,0 %") — one decimal, in the language of the dictionary. */
function percentFormatter(t: Messages) {
  const locale = LOCALES.find((l) => messages[l] === t) ?? "en";
  const format = new Intl.NumberFormat(INTL_LOCALE[locale], { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (ratio: number) => format.format(ratio);
}

/** Thresholds are deliberately simple and explained in each alert's text. */
export const ALERT_THRESHOLDS = {
  d1Critical: 0.03,
  d1Warning: 0.08,
  dauDrop: -0.3,
  minDauForRevenueAlert: 50,
};

/**
 * Alerts derived from real analytics for one game (pure, unit-tested).
 * Texts come from `t` (the dictionary of the interface language: getT() /
 * getRequestT()); English when omitted.
 */
export function computeGameAlerts({ gameName, dau, revenue, d1 }: AlertInput, t: Messages = messages.en): GameAlert[] {
  const alerts: GameAlert[] = [];
  const text = t.games.alerts;
  const pct = percentFormatter(t);

  const d1Avg = avg(d1.current);
  if (d1Avg !== null && d1Avg < ALERT_THRESHOLDS.d1Warning) {
    const critical = d1Avg < ALERT_THRESHOLDS.d1Critical;
    alerts.push({
      id: `${gameName}-d1`,
      severity: critical ? "critical" : "warning",
      title: text.d1Title(pct(d1Avg)),
      detail: text.d1Detail(gameName, critical ? 3 : 8),
    });
  }

  const dauNow = avg(dau.current);
  const dauBefore = avg(dau.previous);
  if (dauNow !== null && dauBefore !== null && dauBefore > 0) {
    const change = dauNow / dauBefore - 1;
    if (change <= ALERT_THRESHOLDS.dauDrop) {
      alerts.push({
        id: `${gameName}-dau`,
        severity: "warning",
        title: text.dauTitle(pct(-change)),
        detail: text.dauDetail(gameName, String(Math.round(dauNow)), String(Math.round(dauBefore))),
      });
    }
  }

  if (revenue.current.length > 0 && sum(revenue.current) === 0 && (dauNow ?? 0) >= ALERT_THRESHOLDS.minDauForRevenueAlert) {
    alerts.push({
      id: `${gameName}-revenue`,
      severity: "info",
      title: text.revenueTitle,
      detail: text.revenueDetail(gameName, String(Math.round(dauNow ?? 0))),
    });
  }

  return alerts;
}
