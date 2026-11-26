/**
 * DEMONSTRATION DATA for the Overview — market highlights, until the Roblox
 * Discover integration ships. Fictional, never written to the database.
 */

// Agents live in their own feature; re-exported for the Overview.
export { DEMO_AGENTS, type DemoAgent } from "@/features/agents/demo";

export const DEMO_MARKET_HIGHLIGHTS = [
  { name: "Obby Rush Deluxe", genre: "Obby", ccu: 48_200, growth: 0.62 },
  { name: "Tower Tycoon X", genre: "Tycoon", ccu: 31_900, growth: 0.38 },
  { name: "Mystery Mansion", genre: "Horror", ccu: 22_400, growth: 0.27 },
  { name: "Pet Racers", genre: "Racing", ccu: 15_100, growth: 0.21 },
  { name: "Sky Islands", genre: "Adventure", ccu: 9_800, growth: 0.19 },
];
