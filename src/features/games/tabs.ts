/**
 * Statistics tabs of a game page (?tab=…). Kept out of the "use client"
 * tab bar: values imported from a client module into a Server Component are
 * client references, not the actual array. Labels: t.games.tabs[value].
 */
export const GAME_TABS = [{ value: "performance" }, { value: "acquisition" }, { value: "thumbnails" }] as const;

export type GameTab = (typeof GAME_TABS)[number]["value"];

export const DEFAULT_GAME_TAB: GameTab = "performance";

export function parseGameTab(value: unknown): GameTab {
  return GAME_TABS.find((t) => t.value === value)?.value ?? DEFAULT_GAME_TAB;
}
