"use client";

import { Check, ExternalLink, Eye, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFormat, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";
import { addToWatchlist } from "@/features/watchlist/actions";

/** Serializable row (mirrors data.ts DiscoverGame). */
export type DiscoverRow = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  genre: string | null;
  rank: number;
  playerCount: number;
  upVotes: number;
  downVotes: number;
  iconUrl: string | null;
  visits: number | null;
  created: string | null;
  ageDays: number | null;
  playersYesterday: number | null;
  playersLastWeek: number | null;
};

const ALL = "all";

/** Genre filter + search, kept in the URL. */
export function DiscoverFilters({ genres }: { genres: string[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const t = useT();
  const l = t.discover.filters;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", query.trim()), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={l.genre}
        value={params.get("genre") ?? ALL}
        onValueChange={(v) => update("genre", v)}
        options={[{ value: ALL, label: l.allGenres }, ...genres.map((g) => ({ value: g, label: g }))]}
        className="w-48"
      />
      <SearchInput aria-label={l.searchLabel} placeholder={l.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-60" />
    </div>
  );
}

export function WatchButton({ universeId, watching: initiallyWatching, name }: { universeId: number; watching: boolean; name: string }) {
  const [watching, setWatching] = useState(initiallyWatching);
  const [pending, startTransition] = useTransition();
  const t = useT();
  const l = t.discover.watchButton;
  if (watching) {
    return (
      <span className="inline-flex h-7 items-center gap-1 px-2 text-xs text-good">
        <Check className="size-3.5" aria-hidden />
        {l.watching}
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      aria-label={l.addLabel(name)}
      onClick={() =>
        startTransition(async () => {
          const result = await addToWatchlist(universeId);
          if (result.ok) {
            setWatching(true);
            toast.success(result.message ?? l.added);
          } else toast.error(result.message ?? result.fieldErrors?.universeId ?? l.failed);
        })
      }
    >
      <Eye aria-hidden />
      {l.watch}
    </Button>
  );
}

function Delta({ now, before }: { now: number; before: number | null }) {
  const f = useFormat();
  if (before === null || before === 0) return <span className="text-fg-4">—</span>;
  const change = now / before - 1;
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tabular", up ? "text-good" : "text-critical")}>
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : "−"}
      {f.formatPercent(Math.abs(change))}
    </span>
  );
}

function age(days: number | null, labels: Messages["discover"]["age"]): string {
  if (days === null) return "—";
  if (days < 1) return labels.today;
  if (days < 60) return labels.days(days);
  if (days < 730) return labels.months(Math.round(days / 30));
  return labels.years(Math.round(days / 365));
}

export function GamesTable({
  rows,
  watched,
  canWatch,
  mode = "chart",
  emptyTitle,
}: {
  rows: DiscoverRow[];
  watched: number[];
  canWatch: boolean;
  mode?: "chart" | "releases";
  emptyTitle?: string;
}) {
  const t = useT();
  const f = useFormat();
  const l = t.discover.table;
  const watchedSet = new Set(watched);
  const columns: Column<DiscoverRow>[] = [
    { id: "rank", header: "#", sortValue: (g) => g.rank, className: "w-10", cell: (g) => <span className="font-mono text-xs text-fg-3">{g.rank}</span> },
    {
      id: "game",
      header: l.game,
      sortValue: (g) => g.name.toLowerCase(),
      cell: (g) => (
        <div className="flex min-w-0 items-center gap-3">
          {g.iconUrl ? (
            <Image src={g.iconUrl} alt="" width={36} height={36} unoptimized className="size-9 shrink-0 rounded-md border border-line-strong object-cover" />
          ) : (
            <span className="size-9 shrink-0 rounded-md border border-line-strong bg-surface-2" aria-hidden />
          )}
          <div className="min-w-0">
            <a
              href={`https://www.roblox.com/games/${g.rootPlaceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-xs items-center gap-1 font-medium text-fg hover:text-accent"
            >
              <span className="truncate">{g.name}</span>
              <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </a>
            <p className="truncate text-xs text-fg-3">{g.genre ?? "—"}</p>
          </div>
        </div>
      ),
    },
    { id: "players", header: l.playingNow, align: "right", sortValue: (g) => g.playerCount, cell: (g) => <span className="tabular text-fg">{f.formatNumber(g.playerCount)}</span> },
    { id: "day", header: l.vsYesterday, align: "right", sortValue: (g) => (g.playersYesterday ? g.playerCount / g.playersYesterday : null), cell: (g) => <Delta now={g.playerCount} before={g.playersYesterday} /> },
    { id: "week", header: l.vsLastWeek, align: "right", sortValue: (g) => (g.playersLastWeek ? g.playerCount / g.playersLastWeek : null), cell: (g) => <Delta now={g.playerCount} before={g.playersLastWeek} /> },
    {
      id: "rating",
      header: l.rating,
      align: "right",
      sortValue: (g) => (g.upVotes + g.downVotes ? g.upVotes / (g.upVotes + g.downVotes) : null),
      cell: (g) => <span className="tabular">{g.upVotes + g.downVotes ? f.formatPercent(g.upVotes / (g.upVotes + g.downVotes)) : "—"}</span>,
    },
    { id: "visits", header: l.visits, align: "right", sortValue: (g) => g.visits, cell: (g) => <span className="tabular">{g.visits === null ? "—" : f.formatCompact(g.visits)}</span> },
    mode === "releases"
      ? { id: "released", header: l.released, align: "right", sortValue: (g) => g.created, cell: (g) => <span className="whitespace-nowrap tabular" title={g.created ? f.formatDate(g.created) : undefined}>{g.created ? f.formatShortDate(g.created) : "—"}</span> }
      : { id: "age", header: l.age, align: "right", sortValue: (g) => g.ageDays, cell: (g) => <span className="whitespace-nowrap tabular">{age(g.ageDays, t.discover.age)}</span> },
  ];
  if (canWatch) {
    columns.push({ id: "watch", header: "", align: "right", className: "w-28", cell: (g) => <WatchButton universeId={g.universeId} name={g.name} watching={watchedSet.has(g.universeId)} /> });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(g) => String(g.universeId)}
        pageSize={25}
        caption={l.caption}
        empty={<EmptyState title={emptyTitle ?? l.emptyTitle} description={l.emptyDescription} />}
      />
    </div>
  );
}
