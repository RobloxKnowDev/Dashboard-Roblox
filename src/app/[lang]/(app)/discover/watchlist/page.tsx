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
import { getI18n, getT } from "@/i18n/server";
import { likeRatio, robloxGameUrl } from "@/lib/integrations/roblox/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.watchlist.title };
}

async function HeaderAction() {
  const user = await requireUser();
  return user.role && hasMinRole(user.role, "developer") ? <AddToWatchlistButton /> : null;
}

async function WatchCard({ game, canEdit, canRemove }: { game: WatchedGame; canEdit: boolean; canRemove: boolean }) {
  const { t, f } = await getI18n();
  const l = t.discover.watchlist;
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
            <a href={robloxGameUrl(r.rootPlaceId)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-fg hover:text-accent-ink">
              {game.name}
            </a>
          ) : (
            <p className="truncate text-sm font-semibold text-fg">{game.name}</p>
          )}
          <p className="truncate text-xs text-fg-3">{game.genre ?? "—"}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">{l.universe(game.universeId)}</p>
        </div>
        {canRemove ? <RemoveWatchButton id={game.id} name={game.name} /> : null}
      </div>

      <dl className="grid grid-cols-4 gap-3 border-y border-line py-3">
        {[
          [l.stats.playing, r ? f.formatNumber(r.playing) : "—"],
          [l.stats.visits, r ? f.formatCompact(r.visits) : "—"],
          [l.stats.favorites, r ? f.formatCompact(r.favorites) : "—"],
          [l.stats.rating, rating === null ? "—" : f.formatPercent(rating)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[11px] text-fg-3">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-end justify-between gap-3 text-xs text-fg-3">
        <div className="min-w-0">
          <p>{l.watchingSince(f.formatDate(game.addedAt))}</p>
          <p className="mt-0.5">
            {game.history.length === 0
              ? l.historyStarts
              : visitsGained !== null
                ? l.visitsGained(f.formatCompact(visitsGained), game.history.length)
                : l.snapshots(game.history.length)}
          </p>
        </div>
        {ccuTrend.length > 1 ? (
          <div className="w-24 shrink-0" title={l.trendTitle}>
            <Sparkline values={ccuTrend} height={28} />
          </div>
        ) : null}
      </div>

      <NotesEditor id={game.id} notes={game.notes} canEdit={canEdit} />
    </li>
  );
}

async function WatchlistSection() {
  const [user, games, t] = await Promise.all([requireUser(), listWatchlist(), getT()]);
  const l = t.discover.watchlist;
  if (games === null) return <ErrorState description={l.error} />;
  const role = user.role ?? "viewer";
  const canEdit = hasMinRole(role, "developer");

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Eye}
          title={l.emptyTitle}
          description={l.emptyDescription}
          action={
            <Link href="/discover" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {l.browseDiscover}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

export default async function WatchlistPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={t.nav.sections.market}
        title={t.nav.items.watchlist.title}
        description={t.discover.watchlist.description}
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
