import type { DataSource } from "@/lib/data/source";

/**
 * Where each domain's data comes from during this phase.
 * Switching a domain to "live" is a one-line change once its integration
 * (or its Supabase-backed repository) is ready. See docs/ARCHITECTURE.md §5.
 */
export const dataSources = {
  // Live from day one — real records you create, stored in Supabase
  projects: "live",
  tasks: "live",
  team: "live",
  finance: "live",
  games: "live",
  watchlist: "live",
  ideasLibrary: "live",
  notifications: "live",
  settings: "live",

  // Roblox: public stats (no key) and Open Cloud Analytics (API key, per game)
  gamePublicStats: "live",
  gameAnalytics: "live",

  // Demo until their integration ships
  market: "demo", // Discover, trending, weekly releases
  weeklyIdeas: "demo", // AI-generated top 5
  agents: "demo", // agent status + events ingestion
  assistant: "demo", // Claude-powered assistant
} as const satisfies Record<string, DataSource>;

export type DataDomain = keyof typeof dataSources;
