import { describe, expect, it } from "vitest";
import { computeGameAlerts } from "@/features/games/alerts";
import { filterTasks } from "@/features/tasks/filter";
import { messages } from "@/i18n/messages";
import { slugify } from "@/lib/action-result";

const days = (values: number[], start = 1) => values.map((value, i) => ({ date: `2026-11-${String(start + i).padStart(2, "0")}`, value }));

describe("computeGameAlerts", () => {
  it("flags very low day-1 retention as critical", () => {
    const alerts = computeGameAlerts({
      gameName: "Test Game",
      dau: { current: days([100, 100]), previous: days([100, 100]) },
      revenue: { current: days([10, 10]) },
      d1: { current: days([0.01, 0.02]) },
    });
    expect(alerts.map((a) => [a.severity, a.id])).toContainEqual(["critical", "Test Game-d1"]);
  });

  it("flags a large drop in daily players", () => {
    const alerts = computeGameAlerts({
      gameName: "G",
      dau: { current: days([60, 60]), previous: days([100, 100]) },
      revenue: { current: days([5]) },
      d1: { current: days([0.2]) },
    });
    expect(alerts.some((a) => a.id === "G-dau" && a.title.includes("40.0%"))).toBe(true);
  });

  it("writes alerts in the dictionary's language", () => {
    const alerts = computeGameAlerts(
      {
        gameName: "G",
        dau: { current: days([60, 60]), previous: days([100, 100]) },
        revenue: { current: days([5]) },
        d1: { current: days([0.2]) },
      },
      messages.fr,
    );
    expect(alerts[0]?.title).toMatch(/^Joueurs quotidiens en baisse de 40,0\s%$/);
  });

  it("reports no revenue despite traffic", () => {
    const alerts = computeGameAlerts({
      gameName: "G",
      dau: { current: days([80, 90]), previous: [] },
      revenue: { current: days([0, 0]) },
      d1: { current: days([0.25]) },
    });
    expect(alerts.map((a) => a.id)).toEqual(["G-revenue"]);
  });

  it("stays quiet when everything is healthy or there's no data", () => {
    expect(
      computeGameAlerts({ gameName: "G", dau: { current: days([100]), previous: days([95]) }, revenue: { current: days([40]) }, d1: { current: days([0.3]) } }),
    ).toEqual([]);
    expect(computeGameAlerts({ gameName: "G", dau: { current: [], previous: [] }, revenue: { current: [] }, d1: { current: [] } })).toEqual([]);
  });
});

describe("filterTasks", () => {
  const base = { description: null, project: null, assignee: null, dueDate: null };
  const tasks = [
    { ...base, id: "1", title: "Fix save bug", priority: "critical" as const, status: "in_progress", dueDate: "2026-11-20", assignee: { profileId: "me" } },
    { ...base, id: "2", title: "New lobby", priority: "low" as const, status: "todo", dueDate: "2026-11-30" },
    { ...base, id: "3", title: "Daily rewards", priority: "medium" as const, status: "done", assignee: { profileId: "me" } },
    { ...base, id: "4", title: "Old idea", priority: "high" as const, status: "cancelled", assignee: { profileId: "me" } },
  ];

  it("shows open work first, by due date", () => {
    expect(filterTasks(tasks, { view: "all" }, "me").map((t) => t.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("'My tasks' excludes cancelled work and other people's tasks", () => {
    expect(filterTasks(tasks, { view: "mine" }, "me").map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("filters by view, priority and search", () => {
    expect(filterTasks(tasks, { view: "in_progress" }, "me").map((t) => t.id)).toEqual(["1"]);
    expect(filterTasks(tasks, { view: "completed" }, "me").map((t) => t.id)).toEqual(["3"]);
    expect(filterTasks(tasks, { view: "all", priority: "low" }, "me").map((t) => t.id)).toEqual(["2"]);
    expect(filterTasks(tasks, { view: "all", q: "LOBBY" }, "me").map((t) => t.id)).toEqual(["2"]);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Planet Builder 2!")).toBe("planet-builder-2");
    expect(slugify("  Café — Édition Été  ")).toBe("cafe-edition-ete");
    expect(slugify("[🔨] Home Creator")).toBe("home-creator");
  });
});
