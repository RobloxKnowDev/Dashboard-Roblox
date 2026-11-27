/**
 * Statistics tabs of a game page (?tab=…). Kept out of the "use client"
 * tab bar: values imported from a client module into a Server Component are
 * client references, not the actual array.
 */
export const GAME_TABS = [
  { value: "performance", label: "Performance" },
  { value: "acquisition", label: "Acquisition" },
  { value: "thumbnails", label: "Thumbnails" },
] as const;

export type GameTab = (typeof GAME_TABS)[number]["value"];

export const DEFAULT_GAME_TAB: GameTab = "performance";

export function parseGameTab(value: unknown): GameTab {
  return GAME_TABS.find((t) => t.value === value)?.value ?? DEFAULT_GAME_TAB;
}
