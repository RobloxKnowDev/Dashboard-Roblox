/**
 * DEMONSTRATION DATA for AI agents — until agents report their status and
 * events to the dashboard (ingestion API, Phase 2). Deterministic, fictional,
 * never written to the database.
 */
import { DEMO_NOW } from "@/lib/data/source";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export type DemoAgentEvent = {
  id: string;
  type: Enums["agent_event_type"];
  message: string;
  /** Minutes before DEMO_NOW. */
  minutesAgo: number;
};

export type DemoAgent = {
  id: string;
  name: string;
  project: string;
  mission: string;
  status: Enums["agent_status"];
  model: string;
  /** Minutes before DEMO_NOW. */
  startedMinutesAgo: number;
  lastActivityMinutesAgo: number;
  events: DemoAgentEvent[];
};

const ev = (agent: string, index: number, type: DemoAgentEvent["type"], minutesAgo: number, message: string): DemoAgentEvent => ({
  id: `${agent}-e${index}`,
  type,
  message,
  minutesAgo,
});

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "a1",
    name: "Build Agent",
    project: "Lava Escape",
    mission: "Ship the winter map update",
    status: "working",
    model: "Claude Opus 5.5",
    startedMinutesAgo: 96,
    lastActivityMinutesAgo: 2,
    events: [
      ev("a1", 1, "started", 96, "Started mission: ship the winter map update"),
      ev("a1", 2, "progress", 80, "Generated terrain for the frozen lake area"),
      ev("a1", 3, "log", 61, "Optimized 214 parts into 38 unions"),
      ev("a1", 4, "progress", 34, "Placed spawn points and checkpoints (12/12)"),
      ev("a1", 5, "progress", 9, "Running the playtest script on 4 servers"),
      ev("a1", 6, "log", 2, "Playtest: average completion time 7 min 40 s"),
    ],
  },
  {
    id: "a2",
    name: "Balance Agent",
    project: "Pet Café",
    mission: "Tune the economy sinks",
    status: "error",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 140,
    lastActivityMinutesAgo: 25,
    events: [
      ev("a2", 1, "started", 140, "Started mission: tune the economy sinks"),
      ev("a2", 2, "progress", 118, "Loaded 30 days of purchase data"),
      ev("a2", 3, "progress", 72, "Simulating 10,000 player sessions"),
      ev("a2", 4, "error", 25, "Economy simulation timed out after 30 min"),
    ],
  },
  {
    id: "a3",
    name: "QA Agent",
    project: "Sky Racers",
    mission: "Regression tests on kart physics",
    status: "waiting",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 210,
    lastActivityMinutesAgo: 47,
    events: [
      ev("a3", 1, "started", 210, "Started mission: regression tests on kart physics"),
      ev("a3", 2, "progress", 160, "Ran 48 of 60 test tracks"),
      ev("a3", 3, "log", 95, "2 tracks show drift above tolerance"),
      ev("a3", 4, "waiting", 47, "Waiting for a review of the drift fix before continuing"),
    ],
  },
  {
    id: "a4",
    name: "Market Scout",
    project: "Market Intelligence",
    mission: "Scan this week's Roblox releases",
    status: "completed",
    model: "Claude Haiku 5.5",
    startedMinutesAgo: 400,
    lastActivityMinutesAgo: 180,
    events: [
      ev("a4", 1, "started", 400, "Started mission: scan this week's releases"),
      ev("a4", 2, "progress", 300, "Collected 312 new experiences"),
      ev("a4", 3, "progress", 220, "Ranked by early growth and genre"),
      ev("a4", 4, "completed", 180, "Report ready: 5 games to watch"),
    ],
  },
  {
    id: "a5",
    name: "Asset Agent",
    project: "Mine Tycoon",
    mission: "Generate shop UI icons",
    status: "offline",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 3200,
    lastActivityMinutesAgo: 2880,
    events: [
      ev("a5", 1, "started", 3200, "Started mission: generate shop UI icons"),
      ev("a5", 2, "progress", 3050, "Produced 24 of 40 icons"),
      ev("a5", 3, "status_change", 2880, "Went offline (host machine stopped)"),
    ],
  },
];

export function demoTime(minutesAgo: number): Date {
  return new Date(DEMO_NOW.getTime() - minutesAgo * 60_000);
}

export function getDemoAgent(id: string): DemoAgent | undefined {
  return DEMO_AGENTS.find((agent) => agent.id === id);
}
