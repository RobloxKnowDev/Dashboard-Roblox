import "server-only";
import { cacheLife } from "next/cache";

/**
 * Roblox public web APIs — no key needed, works for any experience.
 * Results are cached ~1 minute (players online change constantly; visits and
 * favorites update a few times per hour). Thumbnail URLs from Roblox expire,
 * so they are always fetched fresh rather than stored.
 */

export type RobloxGameInfo = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  description: string;
  genre: string | null;
  playing: number;
  visits: number;
  favorites: number;
  maxPlayers: number;
  created: string;
  updated: string;
  upVotes: number | null;
  downVotes: number | null;
  iconUrl: string | null;
  thumbnailUrl: string | null;
};

const TIMEOUT_MS = 10_000;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Roblox API ${response.status} for ${new URL(url).pathname}`);
  return (await response.json()) as T;
}

type GamesResponse = {
  data: {
    id: number;
    rootPlaceId: number;
    name: string;
    description: string | null;
    genre_l1?: string;
    genre?: string;
    playing: number;
    visits: number;
    favoritedCount: number;
    maxPlayers: number;
    created: string;
    updated: string;
  }[];
};
type VotesResponse = { data: { id: number; upVotes: number; downVotes: number }[] };
type IconsResponse = { data: { targetId: number; state: string; imageUrl: string | null }[] };
type ThumbsResponse = { data: { universeId: number; thumbnails: { state: string; imageUrl: string | null }[] }[] };

/** Cached core — throws on failure so errors are never cached. */
async function fetchGamesCached(universeIds: number[]): Promise<RobloxGameInfo[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });

  const ids = universeIds.join(",");
  const [games, votes, icons, thumbs] = await Promise.all([
    getJson<GamesResponse>(`https://games.roblox.com/v1/games?universeIds=${ids}`),
    getJson<VotesResponse>(`https://games.roblox.com/v1/games/votes?universeIds=${ids}`).catch(() => ({ data: [] })),
    getJson<IconsResponse>(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
    ).catch(() => ({ data: [] })),
    getJson<ThumbsResponse>(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${ids}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
    ).catch(() => ({ data: [] })),
  ]);

  return games.data.map((g) => {
    const vote = votes.data.find((v) => v.id === g.id);
    const icon = icons.data.find((i) => i.targetId === g.id);
    const thumb = thumbs.data.find((t) => t.universeId === g.id)?.thumbnails[0];
    return {
      universeId: g.id,
      rootPlaceId: g.rootPlaceId,
      name: g.name,
      description: g.description ?? "",
      genre: g.genre_l1 || g.genre || null,
      playing: g.playing,
      visits: g.visits,
      favorites: g.favoritedCount,
      maxPlayers: g.maxPlayers,
      created: g.created,
      updated: g.updated,
      upVotes: vote?.upVotes ?? null,
      downVotes: vote?.downVotes ?? null,
      iconUrl: icon?.state === "Completed" ? icon.imageUrl : null,
      thumbnailUrl: thumb?.state === "Completed" ? (thumb.imageUrl ?? null) : null,
    };
  });
}

/**
 * Public info for up to 50 experiences. Returns null when Roblox can't be
 * reached (the UI shows "unavailable" rather than zeros).
 */
export async function getRobloxGames(universeIds: number[]): Promise<Map<number, RobloxGameInfo> | null> {
  if (universeIds.length === 0) return new Map();
  try {
    const sorted = [...new Set(universeIds)].sort((a, b) => a - b).slice(0, 50);
    const games = await fetchGamesCached(sorted);
    return new Map(games.map((g) => [g.universeId, g]));
  } catch {
    return null;
  }
}

/** Like ratio in [0, 1], or null when there are no votes. */
export function likeRatio(game: Pick<RobloxGameInfo, "upVotes" | "downVotes">): number | null {
  const total = (game.upVotes ?? 0) + (game.downVotes ?? 0);
  return total > 0 ? (game.upVotes ?? 0) / total : null;
}

export function robloxGameUrl(placeId: number): string {
  return `https://www.roblox.com/games/${placeId}`;
}
