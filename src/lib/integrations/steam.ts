import "server-only";

/**
 * Steam public web APIs (no key): what's trending, to inspire Roblox games.
 * - ISteamChartsService/GetMostPlayedGames — top 100 by daily peak players
 * - ISteamChartsService/GetTopReleasesPages — Steam's monthly "top releases"
 *   (only pages of the last 4 months: the endpoint stopped being updated in 2025)
 * - store search "popular new releases"
 * - SteamSpy "top 100 in the last two weeks"
 * Then, per game: store details, current players and review summary.
 */

export type SteamCandidate = {
  appId: number;
  name: string;
  url: string;
  image: string | null;
  description: string;
  genres: string[];
  /** Multiplayer, co-op, PvP… (Steam "categories"). */
  categories: string[];
  price: string | null;
  free: boolean;
  /** As Steam writes it ("20 Jun, 2025"). */
  released: string | null;
  /** Year of release when it can be read, for recency. */
  releaseYear: number | null;
  currentPlayers: number | null;
  /** Number of user reviews (Steam "recommendations"). */
  reviewCount: number | null;
  mostPlayedRank: number | null;
  lastWeekRank: number | null;
  /** Where the game was found: most-played, top-releases, popular-new. */
  sources: string[];
};

const TIMEOUT_MS = 15_000;
const HEADERS = { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; StudioDashboard/1.0)" };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Runs tasks with at most `limit` in flight. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type MostPlayed = { response?: { ranks?: { rank: number; appid: number; last_week_rank: number; peak_in_game: number }[] } };
type TopReleases = { response?: { pages?: { name: string; start_of_month?: number; item_ids?: { appid: number }[] }[] } };
type SteamSpyTop = Record<string, { appid: number }>;
type SearchJson = { items?: { name: string; logo: string }[] };
type AppDetails = Record<
  string,
  {
    success: boolean;
    data?: {
      type: string;
      name: string;
      steam_appid: number;
      is_free: boolean;
      required_age: number | string;
      short_description?: string;
      header_image?: string;
      genres?: { description: string }[];
      categories?: { description: string }[];
      release_date?: { coming_soon: boolean; date: string };
      price_overview?: { final?: number; final_formatted?: string };
      content_descriptors?: { ids?: number[] };
      recommendations?: { total?: number };
    };
  }
>;
type Players = { response?: { player_count?: number; result?: number } };

/** Steam ids of adult-only content descriptors (sexual content, nudity). */
const ADULT_DESCRIPTORS = new Set([3, 4]);
/** Above this price (USD cents) it's a big-budget game — not what a small Roblox studio adapts. */
const MAX_PRICE_CENTS = 4000;
/** Only games released in the last N years: trends, not classics. */
const MAX_AGE_YEARS = 3;
/**
 * The Steam store answers "Access Denied" for a few minutes after ~150
 * requests in a short time: look up at most this many games, two at a time,
 * with a pause, and stop after repeated refusals.
 */
const MAX_DETAIL_LOOKUPS = 90;
const DETAIL_PAUSE_MS = 250;
const MAX_CONSECUTIVE_FAILURES = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function details(appId: number) {
  const data = await getJson<AppDetails>(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english&filters=basic,genres,categories,release_date,price_overview,content_descriptors,recommendations`,
  );
  // undefined = the store refused or didn't answer; null = not a usable app.
  if (data === null) return undefined;
  const entry = data[String(appId)];
  return entry?.success ? (entry.data ?? null) : null;
}

/**
 * Trending Steam games worth looking at for a Roblox adaptation: released in
 * the last three years, at most $40, playable now, no adult content.
 * Sorted by current players, at most `limit`.
 * (The review-score endpoint refuses automated requests, so only the number
 * of reviews is kept.)
 */
export async function collectSteamCandidates(today: string, limit = 70): Promise<SteamCandidate[]> {
  const [mostPlayed, topReleases, popularNew, steamSpy] = await Promise.all([
    getJson<MostPlayed>("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"),
    getJson<TopReleases>("https://api.steampowered.com/ISteamChartsService/GetTopReleasesPages/v1/"),
    getJson<SearchJson>("https://store.steampowered.com/search/results/?filter=popularnew&json=1&cc=us&l=english&count=50"),
    getJson<SteamSpyTop>("https://steamspy.com/api.php?request=top100in2weeks"),
  ]);

  const found = new Map<number, { sources: Set<string>; rank: number | null; lastWeekRank: number | null }>();
  const add = (appId: number, source: string, rank: number | null = null, lastWeekRank: number | null = null) => {
    const entry = found.get(appId) ?? { sources: new Set<string>(), rank: null, lastWeekRank: null };
    entry.sources.add(source);
    if (rank !== null) {
      entry.rank = rank;
      entry.lastWeekRank = lastWeekRank;
    }
    found.set(appId, entry);
  };

  for (const r of mostPlayed?.response?.ranks ?? []) add(r.appid, "most-played", r.rank, r.last_week_rank > 0 ? r.last_week_rank : null);
  const fourMonthsAgo = Date.parse(`${today}T00:00:00Z`) / 1000 - 120 * 86_400;
  for (const page of topReleases?.response?.pages ?? []) {
    if ((page.start_of_month ?? 0) < fourMonthsAgo) continue;
    for (const item of page.item_ids ?? []) add(item.appid, "top-releases");
  }
  for (const game of Object.values(steamSpy ?? {})) if (game?.appid) add(game.appid, "trending-2-weeks");
  for (const item of popularNew?.items ?? []) {
    const appId = Number(/\/apps\/(\d+)\//.exec(item.logo)?.[1]);
    if (appId) add(appId, "popular-new");
  }

  const currentYear = Number(today.slice(0, 4));
  // Recent releases first, then the most-played chart in rank order, then SteamSpy's two-week top.
  const priority = (id: number) => {
    const meta = found.get(id)!;
    const recent = meta.sources.has("top-releases") || meta.sources.has("popular-new");
    return (recent ? 0 : meta.rank !== null ? 1000 : 2000) + (meta.rank ?? 500);
  };
  const ids = [...found.keys()].sort((a, b) => priority(a) - priority(b)).slice(0, MAX_DETAIL_LOOKUPS);
  let failures = 0;
  const rows = await pool(ids, 2, async (appId): Promise<SteamCandidate | null> => {
    if (failures >= MAX_CONSECUTIVE_FAILURES) return null;
    await sleep(DETAIL_PAUSE_MS);
    const info = await details(appId);
    if (info === undefined) {
      failures += 1;
      return null;
    }
    failures = 0;
    if (!info || info.type !== "game" || info.release_date?.coming_soon) return null;
    if (Number(info.required_age) >= 18 || (info.content_descriptors?.ids ?? []).some((id) => ADULT_DESCRIPTORS.has(id))) return null;
    if ((info.price_overview?.final ?? 0) > MAX_PRICE_CENTS) return null;
    const meta = found.get(appId)!;
    const year = Number(/(\d{4})/.exec(info.release_date?.date ?? "")?.[1]) || null;
    if (year === null || year < currentYear - MAX_AGE_YEARS) return null;
    return {
      appId,
      name: info.name,
      url: `https://store.steampowered.com/app/${appId}`,
      image: info.header_image ?? null,
      description: (info.short_description ?? "").replace(/\s+/g, " ").trim().slice(0, 280),
      genres: (info.genres ?? []).map((g) => g.description),
      categories: (info.categories ?? []).map((c) => c.description).filter((c) => /multi|co-op|pvp|online|split|shared/i.test(c)),
      price: info.is_free ? "Free" : (info.price_overview?.final_formatted ?? null),
      free: info.is_free,
      released: info.release_date?.date ?? null,
      releaseYear: year,
      currentPlayers: null,
      reviewCount: info.recommendations?.total ?? null,
      mostPlayedRank: meta.rank,
      lastWeekRank: meta.lastWeekRank,
      sources: [...meta.sources],
    };
  });

  const games = rows.filter((g): g is SteamCandidate => g !== null);
  await pool(games, 4, async (game) => {
    const players = await getJson<Players>(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${game.appId}`);
    game.currentPlayers = players?.response?.result === 1 ? (players.response.player_count ?? null) : null;
  });

  return games.sort((a, b) => (b.currentPlayers ?? 0) - (a.currentPlayers ?? 0)).slice(0, limit);
}
