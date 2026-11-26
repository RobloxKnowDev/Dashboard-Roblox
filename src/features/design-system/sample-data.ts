import { demoDailySeries } from "@/lib/data/demo-utils";

/** Illustrative data for the design-system showcase only (DEMO). */
export const sampleRevenue = demoDailySeries(
  30,
  [
    { key: "robux", start: 1800, growth: 0.45, noise: 0.08, weekendBoost: 0.35 },
    { key: "devex", start: 900, growth: 0.3, noise: 0.06, weekendBoost: 0.2 },
  ],
  7,
);

export const sampleCcu = demoDailySeries(30, [{ key: "ccu", start: 2400, growth: 0.6, noise: 0.1, weekendBoost: 0.5 }], 11);

export const sampleGames = [
  { category: "Lava Escape", visits: 41200 },
  { category: "Sky Racers", visits: 28700 },
  { category: "Pet Café", visits: 19400 },
  { category: "Mine Tycoon", visits: 12800 },
  { category: "Zombie Rush", visits: 6100 },
];

export type SampleTask = {
  id: string;
  title: string;
  project: string;
  priority: "low" | "medium" | "high" | "critical";
  due: string;
  status: "todo" | "in_progress" | "done";
};

export const sampleTasks: SampleTask[] = [
  { id: "t1", title: "Rebalance lava rise speed", project: "Lava Escape", priority: "high", due: "2026-11-28", status: "in_progress" },
  { id: "t2", title: "Kart drift tuning", project: "Sky Racers", priority: "medium", due: "2026-12-02", status: "todo" },
  { id: "t3", title: "Fix datastore save on leave", project: "Pet Café", priority: "critical", due: "2026-11-27", status: "in_progress" },
  { id: "t4", title: "New lobby thumbnail", project: "Mine Tycoon", priority: "low", due: "2026-12-10", status: "todo" },
  { id: "t5", title: "Daily rewards UI", project: "Lava Escape", priority: "medium", due: "2026-11-20", status: "done" },
  { id: "t6", title: "Anti-exploit checks on remotes", project: "Sky Racers", priority: "high", due: "2026-12-01", status: "todo" },
];
