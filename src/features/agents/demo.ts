/**
 * DEMONSTRATION DATA for AI agents — until agents report their status and
 * events to the dashboard (ingestion API, Phase 2). Deterministic, fictional,
 * never written to the database.
 */
import type { Locale } from "@/i18n/config";
import { DEMO_NOW } from "@/lib/data/source";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/** A demo text in every interface language. */
export type DemoText = Record<Locale, string>;

export type DemoAgentEvent = {
  id: string;
  type: Enums["agent_event_type"];
  /** English text (kept for existing callers) — screens show `messages[locale]`. */
  message: string;
  /** The message in each interface language. */
  messages: DemoText;
  /** Minutes before DEMO_NOW. */
  minutesAgo: number;
};

export type DemoAgent = {
  id: string;
  name: string;
  project: string;
  /** English text (kept for existing callers) — screens show `missions[locale]`. */
  mission: string;
  /** The mission in each interface language. */
  missions: DemoText;
  status: Enums["agent_status"];
  model: string;
  /** Minutes before DEMO_NOW. */
  startedMinutesAgo: number;
  lastActivityMinutesAgo: number;
  events: DemoAgentEvent[];
};

const ev = (agent: string, index: number, type: DemoAgentEvent["type"], minutesAgo: number, text: DemoText): DemoAgentEvent => ({
  id: `${agent}-e${index}`,
  type,
  message: text.en,
  messages: text,
  minutesAgo,
});

const defineAgent = ({ mission, ...rest }: Omit<DemoAgent, "mission" | "missions"> & { mission: DemoText }): DemoAgent => ({
  ...rest,
  mission: mission.en,
  missions: mission,
});

export const DEMO_AGENTS: DemoAgent[] = [
  defineAgent({
    id: "a1",
    name: "Build Agent",
    project: "Lava Escape",
    mission: { en: "Ship the winter map update", fr: "Sortir la mise à jour de la map d'hiver" },
    status: "working",
    model: "Claude Opus 5.5",
    startedMinutesAgo: 96,
    lastActivityMinutesAgo: 2,
    events: [
      ev("a1", 1, "started", 96, {
        en: "Started mission: ship the winter map update",
        fr: "Mission lancée : sortir la mise à jour de la map d'hiver",
      }),
      ev("a1", 2, "progress", 80, {
        en: "Generated terrain for the frozen lake area",
        fr: "Terrain généré pour la zone du lac gelé",
      }),
      ev("a1", 3, "log", 61, { en: "Optimized 214 parts into 38 unions", fr: "214 parts optimisées en 38 unions" }),
      ev("a1", 4, "progress", 34, {
        en: "Placed spawn points and checkpoints (12/12)",
        fr: "Points de spawn et checkpoints placés (12/12)",
      }),
      ev("a1", 5, "progress", 9, {
        en: "Running the playtest script on 4 servers",
        fr: "Script de playtest en cours sur 4 serveurs",
      }),
      ev("a1", 6, "log", 2, {
        en: "Playtest: average completion time 7 min 40 s",
        fr: "Playtest : temps moyen pour finir 7 min 40 s",
      }),
    ],
  }),
  defineAgent({
    id: "a2",
    name: "Balance Agent",
    project: "Pet Café",
    mission: { en: "Tune the economy sinks", fr: "Régler les sinks de l'économie" },
    status: "error",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 140,
    lastActivityMinutesAgo: 25,
    events: [
      ev("a2", 1, "started", 140, {
        en: "Started mission: tune the economy sinks",
        fr: "Mission lancée : régler les sinks de l'économie",
      }),
      ev("a2", 2, "progress", 118, { en: "Loaded 30 days of purchase data", fr: "30 jours de données d'achat chargés" }),
      ev("a2", 3, "progress", 72, { en: "Simulating 10,000 player sessions", fr: "Simulation de 10 000 sessions de joueurs" }),
      ev("a2", 4, "error", 25, {
        en: "Economy simulation timed out after 30 min",
        fr: "La simulation de l'économie a expiré au bout de 30 min",
      }),
    ],
  }),
  defineAgent({
    id: "a3",
    name: "QA Agent",
    project: "Sky Racers",
    mission: { en: "Regression tests on kart physics", fr: "Tests de régression sur la physique des karts" },
    status: "waiting",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 210,
    lastActivityMinutesAgo: 47,
    events: [
      ev("a3", 1, "started", 210, {
        en: "Started mission: regression tests on kart physics",
        fr: "Mission lancée : tests de régression sur la physique des karts",
      }),
      ev("a3", 2, "progress", 160, { en: "Ran 48 of 60 test tracks", fr: "48 circuits de test passés sur 60" }),
      ev("a3", 3, "log", 95, {
        en: "2 tracks show drift above tolerance",
        fr: "2 circuits montrent une dérive au-delà de la tolérance",
      }),
      ev("a3", 4, "waiting", 47, {
        en: "Waiting for a review of the drift fix before continuing",
        fr: "En attente d'une revue du correctif de dérive avant de continuer",
      }),
    ],
  }),
  defineAgent({
    id: "a4",
    name: "Market Scout",
    project: "Market Intelligence",
    mission: { en: "Scan this week's Roblox releases", fr: "Analyser les sorties Roblox de la semaine" },
    status: "completed",
    model: "Claude Haiku 5.5",
    startedMinutesAgo: 400,
    lastActivityMinutesAgo: 180,
    events: [
      ev("a4", 1, "started", 400, {
        en: "Started mission: scan this week's releases",
        fr: "Mission lancée : analyser les sorties de la semaine",
      }),
      ev("a4", 2, "progress", 300, { en: "Collected 312 new experiences", fr: "312 nouvelles expériences collectées" }),
      ev("a4", 3, "progress", 220, { en: "Ranked by early growth and genre", fr: "Classement par croissance de départ et par genre" }),
      ev("a4", 4, "completed", 180, { en: "Report ready: 5 games to watch", fr: "Rapport prêt : 5 jeux à surveiller" }),
    ],
  }),
  defineAgent({
    id: "a5",
    name: "Asset Agent",
    project: "Mine Tycoon",
    mission: { en: "Generate shop UI icons", fr: "Générer les icônes de l'UI de la boutique" },
    status: "offline",
    model: "Claude Sonnet 5.5",
    startedMinutesAgo: 3200,
    lastActivityMinutesAgo: 2880,
    events: [
      ev("a5", 1, "started", 3200, {
        en: "Started mission: generate shop UI icons",
        fr: "Mission lancée : générer les icônes de l'UI de la boutique",
      }),
      ev("a5", 2, "progress", 3050, { en: "Produced 24 of 40 icons", fr: "24 icônes produites sur 40" }),
      ev("a5", 3, "status_change", 2880, {
        en: "Went offline (host machine stopped)",
        fr: "Passé hors ligne (machine hôte arrêtée)",
      }),
    ],
  }),
];

export function demoTime(minutesAgo: number): Date {
  return new Date(DEMO_NOW.getTime() - minutesAgo * 60_000);
}

export function getDemoAgent(id: string): DemoAgent | undefined {
  return DEMO_AGENTS.find((agent) => agent.id === id);
}
