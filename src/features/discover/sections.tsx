import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { ErrorState } from "@/components/feedback/states";
import { Card, CardHeader } from "@/components/ui/card";
import { checkAccess } from "@/lib/auth/session";
import type { ChartSortId } from "@/lib/integrations/roblox/explore";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { DiscoverFilters, GamesTable, WatchButton, type DiscoverRow } from "./components";
import { getChart, getRecentReleases, getWatchedUniverseIds, type DiscoverGame } from "./data";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export const CHART_TABS: { id: ChartSortId; label: string; hint: string }[] = [
  { id: "top-trending", label: "Trending", hint: "Gaining the most attention right now" },
  { id: "up-and-coming", label: "Growing", hint: "Rising fast — Roblox's Up-and-Coming chart" },
  { id: "top-playing-now", label: "Popular", hint: "Most players online right now" },
  { id: "top-earning", label: "Top earning", hint: "Highest Robux earnings" },
  { id: "top-rated", label: "Top rated", hint: "Best like ratios" },
  { id: "most-popular", label: "Most popular", hint: "Most played overall" },
  { id: "top-revisited", label: "Revisited", hint: "Players keep coming back" },
  { id: "fun-with-friends", label: "With friends", hint: "Played in groups" },
];

export function parseChart(value: string | undefined): ChartSortId {
  return CHART_TABS.find((t) => t.id === value)?.id ?? "top-trending";
}

function toRow(g: DiscoverGame): DiscoverRow {
  return {
    universeId: g.universeId,
    rootPlaceId: g.rootPlaceId,
    name: g.name,
    genre: g.genre,
    rank: g.rank,
    playerCount: g.playerCount,
    upVotes: g.upVotes,
    downVotes: g.downVotes,
    iconUrl: g.iconUrl,
    visits: g.visits,
    created: g.created,
    ageDays: g.ageDays,
    playersYesterday: g.playersYesterday,
    playersLastWeek: g.playersLastWeek,
  };
}

function applyFilters(games: DiscoverGame[], params: SearchParams) {
  const genre = one(params.genre);
  const q = one(params.q)?.toLowerCase().trim();
  return games.filter((g) => (!genre || g.genre === genre) && (!q || g.name.toLowerCase().includes(q)));
}

function genresOf(games: DiscoverGame[]) {
  return [...new Set(games.map((g) => g.genre).filter((g): g is string => !!g))].sort();
}

async function todayIso() {
  await connection();
  return new Date().toISOString().slice(0, 10);
}

function SourceNote({ hasHistory }: { hasHistory: boolean }) {
  return (
    <p className="text-[11px] text-fg-3">
      Live from Roblox&apos;s public charts, refreshed every 15 minutes (sponsored entries excluded).{" "}
      {hasHistory
        ? "Evolution comes from the dashboard's daily snapshots."
        : "The evolution columns fill in from tomorrow — the dashboard records the charts once a day."}
    </p>
  );
}

/** Chart pills — plain links, so each chart has its own URL. */
export function ChartPills({ active, params }: { active: ChartSortId; params: SearchParams }) {
  return (
    <nav aria-label="Charts" className="flex flex-wrap gap-1.5">
      {CHART_TABS.map((tab) => {
        const next = new URLSearchParams();
        if (tab.id !== "top-trending") next.set("chart", tab.id);
        const genre = one(params.genre);
        if (genre) next.set("genre", genre);
        const qs = next.toString();
        return (
          <Link
            key={tab.id}
            href={qs ? `/discover?${qs}` : "/discover"}
            title={tab.hint}
            aria-current={tab.id === active ? "page" : undefined}
            scroll={false}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              tab.id === active ? "border-accent/40 bg-accent-soft text-accent" : "border-line text-fg-3 hover:border-line-strong hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** "Games to watch": young experiences already in the Up-and-Coming chart. */
async function ToWatch({ canWatch, watched }: { canWatch: boolean; watched: Set<number> }) {
  const growing = await getChart("up-and-coming", await todayIso());
  if (growing.status !== "ok") return null;
  const picks = growing.games.filter((g) => g.ageDays !== null && g.ageDays <= 60).slice(0, 4);
  if (picks.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Games to watch"
        description="Created in the last 60 days and already climbing Roblox's Up-and-Coming chart"
        actions={<SourceBadge source="live" />}
      />
      <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {picks.map((g) => (
          <li key={g.universeId} className="flex items-center gap-3 rounded-md border border-line bg-surface-2/40 p-3">
            {g.iconUrl ? (
              <Image src={g.iconUrl} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-md border border-line-strong object-cover" />
            ) : (
              <Sparkles className="size-5 text-fg-3" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg">{g.name}</p>
              <p className="truncate text-xs text-fg-3">
                {formatNumber(g.playerCount)} playing · {g.ageDays} d old
              </p>
            </div>
            {canWatch ? <WatchButton universeId={g.universeId} name={g.name} watching={watched.has(g.universeId)} /> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function ChartSection({ params }: { params: SearchParams }) {
  const sortId = parseChart(one(params.chart));
  const [chart, access, watched] = await Promise.all([getChart(sortId, await todayIso()), checkAccess("developer"), getWatchedUniverseIds()]);
  if (chart.status !== "ok") {
    return <ErrorState title="Roblox charts unavailable" description="Roblox didn't answer or changed its charts. This usually resolves itself — try again later." />;
  }
  const canWatch = access.status === "allowed";
  const filtered = applyFilters(chart.games, params);
  return (
    <div className="space-y-4">
      {sortId === "top-trending" && !one(params.genre) && !one(params.q) ? <ToWatch canWatch={canWatch} watched={watched} /> : null}
      <DiscoverFilters genres={genresOf(chart.games)} />
      <GamesTable rows={filtered.map(toRow)} watched={[...watched]} canWatch={canWatch} />
      <SourceNote hasHistory={chart.hasHistory} />
    </div>
  );
}

export async function ReleasesSection({ params }: { params: SearchParams }) {
  const within = one(params.within) === "30" ? 30 : 7;
  const [releases, access, watched] = await Promise.all([getRecentReleases(await todayIso(), within), checkAccess("developer"), getWatchedUniverseIds()]);
  if (releases.status !== "ok") {
    return <ErrorState title="Roblox charts unavailable" description="Roblox didn't answer or changed its charts. Try again later." />;
  }
  const filtered = applyFilters(releases.games, params);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30].map((days) => (
          <Link
            key={days}
            href={days === 7 ? "/discover/releases" : "/discover/releases?within=30"}
            aria-current={within === days ? "page" : undefined}
            scroll={false}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              within === days ? "border-accent/40 bg-accent-soft text-accent" : "border-line text-fg-3 hover:border-line-strong hover:text-fg",
            )}
          >
            {days === 7 ? "Released this week" : "Released this month"}
          </Link>
        ))}
        <span className="text-xs text-fg-3">{releases.games.length} experiences found in the charts</span>
      </div>
      <DiscoverFilters genres={genresOf(releases.games)} />
      <GamesTable
        rows={filtered.map(toRow)}
        watched={[...watched]}
        canWatch={access.status === "allowed"}
        mode="releases"
        emptyTitle={within === 7 ? "No new release in the charts this week" : "No release this month matches"}
      />
      <p className="text-[11px] text-fg-3">
        Roblox has no public &quot;new releases&quot; list: these are the experiences created in the last {within} days that already appear in
        Roblox&apos;s charts — the new games actually getting traction.
      </p>
    </div>
  );
}
