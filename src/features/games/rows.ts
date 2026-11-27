import type { DailyPoint } from "@/lib/integrations/roblox/analytics";

/** Chart rows from several daily series: one row per date, one key per series. */
export function rowsOf(series: Record<string, DailyPoint[]>) {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const [key, points] of Object.entries(series)) {
    for (const p of points) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[key] = p.value;
      byDate.set(p.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))) as ({ date: string } & Record<
    string,
    number | string
  >)[];
}
