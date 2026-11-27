import "server-only";

/**
 * Roblox game search — the same search the Roblox app uses (public, no key).
 * Used to check whether an idea already exists on Roblox before proposing it.
 */

export type RobloxSearchHit = {
  universeId: number;
  placeId: number;
  name: string;
  /** Players online right now. */
  playing: number;
  upVotes: number;
  downVotes: number;
  description: string;
};

type OmniSearch = {
  searchResults?: {
    contentGroupType?: string;
    contents?: {
      universeId?: number;
      rootPlaceId?: number;
      name?: string;
      description?: string;
      playerCount?: number;
      totalUpVotes?: number;
      totalDownVotes?: number;
      isSponsored?: boolean;
    }[];
  }[];
};

/** Up to `max` games for a query, sponsored results excluded. Empty on failure. */
export async function searchRobloxGames(query: string, max = 8): Promise<RobloxSearchHit[]> {
  const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&sessionId=${crypto.randomUUID()}&pageType=all`;
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as OmniSearch;
    return (data.searchResults ?? [])
      .filter((group) => group.contentGroupType === "Game")
      .flatMap((group) => group.contents ?? [])
      .filter((game) => !game.isSponsored && game.universeId && game.name)
      .slice(0, max)
      .map((game) => ({
        universeId: game.universeId!,
        placeId: game.rootPlaceId ?? 0,
        name: game.name!,
        playing: game.playerCount ?? 0,
        upVotes: game.totalUpVotes ?? 0,
        downVotes: game.totalDownVotes ?? 0,
        description: (game.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
      }));
  } catch {
    return [];
  }
}
