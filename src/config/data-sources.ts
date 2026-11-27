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
  market: "live", // Roblox public charts + daily snapshots

  // Demo until their integration ships
  weeklyIdeas: "live", // Steam trends checked against Roblox, written by Claude (weekly)
  agents: "demo", // agent status + events ingestion
  assistant: "live", // Claude (falls back to demo answers without ANTHROPIC_API_KEY)
} as const satisfies Record<string, DataSource>;

export type DataDomain = keyof typeof dataSources;
