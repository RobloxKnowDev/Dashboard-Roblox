import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { ErrorState } from "@/components/feedback/states";
import { Card, CardHeader } from "@/components/ui/card";
import { getI18n, getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";
import type { ChartSortId } from "@/lib/integrations/roblox/explore";
import { cn } from "@/lib/utils/cn";
import { DiscoverFilters, GamesTable, WatchButton, type DiscoverRow } from "./components";
import { getChart, getRecentReleases, getWatchedUniverseIds, type DiscoverGame } from "./data";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** Charts shown as pills, in order. Labels and hints: t.discover.charts.tabs[id]. */
export const CHART_TABS = [
  "top-trending",
  "up-and-coming",
  "top-playing-now",
  "top-earning",
  "top-rated",
  "most-popular",
  "top-revisited",
  "fun-with-friends",
] as const satisfies readonly ChartSortId[];

type ChartTab = (typeof CHART_TABS)[number];

export function parseChart(value: string | undefined): ChartTab {
  return CHART_TABS.find((id) => id === value) ?? "top-trending";
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

async function SourceNote({ hasHistory }: { hasHistory: boolean }) {
  const l = (await getT()).discover.charts;
  return (
    <p className="text-[11px] text-fg-3">
      {l.sourceNote} {hasHistory ? l.historyNote : l.noHistoryNote}
    </p>
  );
}

/** Chart pills — plain links, so each chart has its own URL. */
export async function ChartPills({ active, params }: { active: ChartSortId; params: SearchParams }) {
  const l = (await getT()).discover.charts;
  return (
    <nav aria-label={l.navLabel} className="flex flex-wrap gap-1.5">
      {CHART_TABS.map((id) => {
        const tab = { id, ...l.tabs[id] };
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
              tab.id === active ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-line text-fg-3 hover:border-line-strong hover:text-fg",
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
  const { t, f } = await getI18n();
  const l = t.discover.toWatch;
  return (
    <Card>
      <CardHeader
        title={l.title}
        description={l.description}
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
              <p className="truncate text-xs text-fg-3">{l.meta(f.formatNumber(g.playerCount), g.ageDays ?? 0)}</p>
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
    const l = (await getT()).discover.charts;
    return <ErrorState title={l.unavailableTitle} description={l.unavailableDescription} />;
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
  const t = await getT();
  const l = t.discover.releases;
  if (releases.status !== "ok") {
    return <ErrorState title={t.discover.charts.unavailableTitle} description={l.unavailableDescription} />;
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
              within === days ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-line text-fg-3 hover:border-line-strong hover:text-fg",
            )}
          >
            {days === 7 ? l.thisWeek : l.thisMonth}
          </Link>
        ))}
        <span className="text-xs text-fg-3">{l.found(releases.games.length)}</span>
      </div>
      <DiscoverFilters genres={genresOf(releases.games)} />
      <GamesTable
        rows={filtered.map(toRow)}
        watched={[...watched]}
        canWatch={access.status === "allowed"}
        mode="releases"
        emptyTitle={within === 7 ? l.emptyWeek : l.emptyMonth}
      />
      <p className="text-[11px] text-fg-3">{l.note(within)}</p>
    </div>
  );
}
