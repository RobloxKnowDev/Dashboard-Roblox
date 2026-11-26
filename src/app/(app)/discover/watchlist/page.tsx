import { Eye } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { AddToWatchlistButton, NotesEditor, RemoveWatchButton } from "@/features/watchlist/components";
import { listWatchlist, type WatchedGame } from "@/features/watchlist/data";
import { hasMinRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { likeRatio, robloxGameUrl } from "@/lib/integrations/roblox/public";
import { formatCompact, formatDate, formatNumber, formatPercent } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Watchlist" };

async function HeaderAction() {
  const user = await requireUser();
  return user.role && hasMinRole(user.role, "developer") ? <AddToWatchlistButton /> : null;
}

function WatchCard({ game, canEdit, canRemove }: { game: WatchedGame; canEdit: boolean; canRemove: boolean }) {
  const r = game.roblox;
  const rating = r ? likeRatio(r) : null;
  const first = game.history[0];
  const visitsGained = r && first?.visits != null ? r.visits - first.visits : null;
  const ccuTrend = game.history.map((h) => h.ccu).filter((v): v is number => v !== null);

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {r?.iconUrl ? (
          <Image src={r.iconUrl} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-lg border border-line-strong object-cover" />
        ) : (
          <span className="size-12 shrink-0 rounded-lg border border-line-strong bg-surface-2" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {r ? (
            <a href={robloxGameUrl(r.rootPlaceId)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-fg hover:text-accent">
              {game.name}
            </a>
          ) : (
            <p className="truncate text-sm font-semibold text-fg">{game.name}</p>
          )}
          <p className="truncate text-xs text-fg-3">{game.genre ?? "—"}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">Universe {game.universeId}</p>
        </div>
        {canRemove ? <RemoveWatchButton id={game.id} name={game.name} /> : null}
      </div>

      <dl className="grid grid-cols-4 gap-3 border-y border-line py-3">
        {[
          ["Playing", r ? formatNumber(r.playing) : "—"],
          ["Visits", r ? formatCompact(r.visits) : "—"],
          ["Favorites", r ? formatCompact(r.favorites) : "—"],
          ["Rating", rating === null ? "—" : formatPercent(rating)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[11px] text-fg-3">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-end justify-between gap-3 text-xs text-fg-3">
        <div className="min-w-0">
          <p>Watching since {formatDate(game.addedAt)}</p>
          <p className="mt-0.5">
            {game.history.length === 0
              ? "History starts with tomorrow's daily snapshot."
              : visitsGained !== null
                ? `+${formatCompact(visitsGained)} visits over ${game.history.length} day${game.history.length > 1 ? "s" : ""} of tracking`
                : `${game.history.length} daily snapshots`}
          </p>
        </div>
        {ccuTrend.length > 1 ? (
          <div className="w-24 shrink-0" title="Players online at each daily snapshot">
            <Sparkline values={ccuTrend} height={28} />
          </div>
        ) : null}
      </div>

      <NotesEditor id={game.id} notes={game.notes} canEdit={canEdit} />
    </li>
  );
}

async function WatchlistSection() {
  const [user, games] = await Promise.all([requireUser(), listWatchlist()]);
  if (games === null) return <ErrorState description="The watchlist couldn't be loaded. Refresh the page to try again." />;
  const role = user.role ?? "viewer";
  const canEdit = hasMinRole(role, "developer");

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Eye}
          title="No games on the watchlist"
          description="Watch competitors and inspirations: their players, visits and favorites are recorded every day."
          action={
            <Link href="/discover" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Browse Roblox Discover
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {games.map((game) => (
        <WatchCard
          key={game.id}
          game={game}
          canEdit={canEdit}
          canRemove={hasMinRole(role, "admin") || (canEdit && game.addedBy === user.id)}
        />
      ))}
    </ul>
  );
}

export default function WatchlistPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Market Intelligence"
        title="Watchlist"
        description="Games you track, with their live stats and daily history."
        actions={
          <Suspense fallback={null}>
            <HeaderAction />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="rounded-lg border border-line bg-surface">
            <ListSkeleton rows={4} />
          </div>
        }
      >
        <WatchlistSection />
      </Suspense>
    </PageContainer>
  );
}
