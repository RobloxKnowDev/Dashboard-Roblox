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
const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

/** Thresholds are deliberately simple and explained in each alert's text. */
export const ALERT_THRESHOLDS = {
  d1Critical: 0.03,
  d1Warning: 0.08,
  dauDrop: -0.3,
  minDauForRevenueAlert: 50,
};

/** Alerts derived from real analytics for one game (pure, unit-tested). */
export function computeGameAlerts({ gameName, dau, revenue, d1 }: AlertInput): GameAlert[] {
  const alerts: GameAlert[] = [];

  const d1Avg = avg(d1.current);
  if (d1Avg !== null && d1Avg < ALERT_THRESHOLDS.d1Warning) {
    const critical = d1Avg < ALERT_THRESHOLDS.d1Critical;
    alerts.push({
      id: `${gameName}-d1`,
      severity: critical ? "critical" : "warning",
      title: `Day-1 retention is ${pct(d1Avg)}`,
      detail: `${gameName} · fewer than ${critical ? 3 : 8} in 100 new players come back the next day`,
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
        title: `Daily players down ${pct(-change)}`,
        detail: `${gameName} · ${Math.round(dauNow)} per day vs ${Math.round(dauBefore)} the previous period`,
      });
    }
  }

  if (revenue.current.length > 0 && sum(revenue.current) === 0 && (dauNow ?? 0) >= ALERT_THRESHOLDS.minDauForRevenueAlert) {
    alerts.push({
      id: `${gameName}-revenue`,
      severity: "info",
      title: "No revenue this period",
      detail: `${gameName} · ${Math.round(dauNow ?? 0)} daily players but no Robux earned`,
    });
  }

  return alerts;
}
