import { DoorOpen, Eye, ImageOff, Images, Info, MousePointerClick, Target, TriangleExclamationPoint, Trophy } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { StatCard } from "@/components/data/stat-card";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MetricChart } from "@/features/shared/metric-chart";
import { parseRange } from "@/features/shared/range";
import type { DailyPoint } from "@/lib/integrations/roblox/analytics";
import { formatCompact, formatPercent, formatPrecisePercent } from "@/lib/utils/format";
import { bestThumbnail, MAX_THUMBNAIL_SERIES, mergePoints, overallQualifiedPtr } from "./acquisition-compute";
import { getGameAcquisition, getGameThumbnails } from "./acquisition";
import { avgOf, deltaOf, sumOf } from "./analytics";
import { AnalyticsUnavailable, loadGame, type Params, type SearchParams } from "./detail";
import { rowsOf } from "./rows";

function RangeNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-fg-3">
      <Info className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

const FAILED_MESSAGE = "Roblox limits how much data the API key can read per minute. Refresh in a minute.";

/** Some queries failed — almost always Roblox's (unpublished) data-point budget. */
function RateLimitNote() {
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
      <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>Some figures couldn&apos;t load: Roblox limits how much data the API key can read per minute. Refresh the page in a minute.</span>
    </p>
  );
}

const pct = (value: number | null) => (value === null ? "—" : formatPrecisePercent(value));

/* ───────────────────────────── Acquisition ───────────────────────────── */

export async function GameAcquisitionSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const requested = parseRange((await searchParams).range);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const data = await getGameAcquisition(game.universe_id, requested, today);

  if (data.status !== "ok") return <AnalyticsUnavailable status={data.status} universeId={game.universe_id} />;

  const { range, sources } = data;
  const reachTotal = sources.reduce((acc, s) => acc + s.reachedTotal, 0);
  const playedTotal = sources.reduce((acc, s) => acc + s.playedTotal, 0);
  const ctrNow = avgOf(data.impressionCtr.current);
  const qptrNow = avgOf(data.qualifiedPtr.current);
  const bounceNow = avgOf(data.bounce60.current);
  const newTotal = sumOf(data.newPlayers);
  const activeTotal = newTotal + sumOf(data.returningPlayers);
  const sourceSeries = sources.map((s) => ({ key: s.key, label: s.label, color: s.color }));
  const common = { source: "live" as const, granularity: "day" as const };
  const { failed } = data;
  const anyFailed = Object.values(failed).some(Boolean);

  return (
    <div className="space-y-4">
      {data.capped ? <RangeNote>Acquisition covers the last 90 days at most — showing the last 90 days.</RangeNote> : null}
      {anyFailed ? <RateLimitNote /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Players reached" value={formatCompact(reachTotal)} source="live" icon={Eye} hint={`Saw the game, ${range.label}`} />
        <StatCard
          label="Impression CTR"
          value={pct(ctrNow)}
          source="live"
          icon={MousePointerClick}
          delta={deltaOf(ctrNow, avgOf(data.impressionCtr.previous))}
          deltaLabel={range.comparison}
          hint="Viewers who clicked the game"
        />
        <StatCard
          label="Qualified play-through"
          value={pct(qptrNow)}
          source="live"
          icon={Target}
          delta={deltaOf(qptrNow, avgOf(data.qualifiedPtr.previous))}
          deltaLabel={range.comparison}
          hint="Viewers who stayed to play"
        />
        <StatCard
          label="First-play bounce"
          value={bounceNow === null ? "—" : formatPercent(bounceNow)}
          source="live"
          icon={DoorOpen}
          delta={deltaOf(bounceNow, avgOf(data.bounce60.previous))}
          deltaLabel={range.comparison}
          upIsGood={false}
          hint="Left within 60 s · home recs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex flex-col xl:col-span-2">
          <CardHeader title="Acquisition by source" description={`Totals, ${range.label}`} actions={<SourceBadge source="live" />} />
          <div className="mt-3 flex-1">
            {sources.length === 0 ? (
              <EmptyState compact title={failed.sources ? "Couldn't load right now" : "No data for this period"} description={failed.sources ? FAILED_MESSAGE : "Roblox hasn't reported acquisition sources for these days yet."} />
            ) : (
              <Table>
                <caption className="sr-only">Players reached and players who played, by acquisition source, {range.label}</caption>
                <THead>
                  <TR>
                    <TH>Source</TH>
                    <TH className="text-right">Reached</TH>
                    <TH className="text-right">Share</TH>
                    <TH className="text-right">Played</TH>
                    <TH className="text-right">Play rate</TH>
                  </TR>
                </THead>
                <TBody>
                  {sources.map((s) => (
                    <TR key={s.key}>
                      <TD className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 text-fg">
                          <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                      </TD>
                      <TD className="text-right tabular">{formatCompact(s.reachedTotal)}</TD>
                      <TD className="text-right tabular text-fg-3">{reachTotal > 0 ? formatPercent(s.reachedTotal / reachTotal) : "—"}</TD>
                      <TD className="text-right tabular">{formatCompact(s.playedTotal)}</TD>
                      <TD className="text-right tabular">{s.playRate === null ? <span className="text-fg-3">—</span> : formatPrecisePercent(s.playRate)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-fg-3">
            {formatCompact(playedTotal)} players started a session. “—”: plays that don&apos;t start from an impression (links, teleports…).
          </p>
        </Card>

        <MetricChart
          title="Reach by source"
          description="Daily unique players who saw the game, by where they saw it"
          label={`Daily unique players who saw the game, by source, ${range.label}`}
          format="compact"
          variant="line"
          rows={rowsOf(Object.fromEntries(sources.map((s) => [s.key, s.reached])))}
          series={sourceSeries}
          emptyMessage={failed.sources ? FAILED_MESSAGE : "Roblox hasn't reported impressions for this period."}
          {...common}
        />
        <MetricChart
          title="Players by source"
          description="Daily unique players who started a session, by source"
          label={`Daily unique players who started a session, by source, ${range.label}`}
          format="compact"
          variant="line"
          rows={rowsOf(Object.fromEntries(sources.map((s) => [s.key, s.played])))}
          series={sourceSeries}
          emptyMessage={failed.sources ? FAILED_MESSAGE : undefined}
          {...common}
        />
        <MetricChart
          title="Conversion"
          description="Viewers who clicked, played a qualified session, or played from home recommendations"
          label={`Impression click-through, qualified play-through and home-recommendation play-through rates, ${range.label}`}
          format="percent"
          variant="line"
          rows={rowsOf({ ctr: data.impressionCtr.current, qptr: data.qualifiedPtr.current, reco: data.recoPtr })}
          series={[
            { key: "ctr", label: "Impression CTR" },
            { key: "qptr", label: "Qualified play-through" },
            { key: "reco", label: "Home recs play-through" },
          ]}
          emptyMessage={failed.conversion ? FAILED_MESSAGE : undefined}
          {...common}
        />
        <MetricChart
          title="First-play bounce rate"
          description="First plays from home recommendations that ended early — lower is better"
          label={`Share of first plays from home recommendations lasting under 60 seconds and 1 to 3 minutes, ${range.label}`}
          format="percent"
          variant="line"
          rows={rowsOf({ b60: data.bounce60.current, b180: data.bounce180 })}
          series={[
            { key: "b60", label: "Left within 60 s" },
            { key: "b180", label: "Left after 1–3 min" },
          ]}
          emptyMessage={failed.bounce ? FAILED_MESSAGE : "Roblox reports this once the game gets players from home recommendations."}
          {...common}
        />
        <div className="xl:col-span-2">
          <MetricChart
            title="New and returning players"
            description={activeTotal > 0 ? `${formatPercent(newTotal / activeTotal)} of daily players were new, ${range.label}` : "Daily active users, new vs returning"}
            label={`Daily active users split into new and returning players, ${range.label}`}
            format="compact"
            variant="line"
            rows={rowsOf({ new: data.newPlayers, returning: data.returningPlayers })}
            series={[
              { key: "new", label: "New" },
              { key: "returning", label: "Returning" },
            ]}
            emptyMessage={failed.newReturning ? FAILED_MESSAGE : undefined}
            {...common}
          />
        </div>
      </div>
      <p className="text-[11px] text-fg-3">
        Roblox Analytics · daily unique players, summed over the period · about one day behind, refreshed hourly.
      </p>
    </div>
  );
}

/* ───────────────────────────── Thumbnails ───────────────────────────── */

export async function GameThumbnailsSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const requested = parseRange((await searchParams).range);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const data = await getGameThumbnails(game.universe_id, requested, today);

  if (data.status !== "ok") return <AnalyticsUnavailable status={data.status} universeId={game.universe_id} />;

  const { range, thumbnails } = data;
  const note = (
    <>
      {data.capped ? <RangeNote>Roblox keeps thumbnail data for 30 days — showing the last 30 days.</RangeNote> : null}
      {data.incomplete ? <RateLimitNote /> : null}
    </>
  );

  if (thumbnails.length === 0) {
    return (
      <div className="space-y-4">
        {note}
        <Card>
          <EmptyState
            icon={Images}
            title={data.incomplete ? "Couldn't load right now" : "No thumbnail data for this period"}
            description={
              data.incomplete
                ? FAILED_MESSAGE
                : "Roblox reports impressions per thumbnail for the last 30 days, once the game's thumbnails are shown to players."
            }
          />
        </Card>
      </div>
    );
  }

  const total = thumbnails.reduce((acc, t) => acc + t.impressions, 0);
  const shown = thumbnails.filter((t) => t.impressions > 0).length;
  const best = bestThumbnail(thumbnails);
  const own = thumbnails.slice(0, MAX_THUMBNAIL_SERIES);
  const rest = thumbnails.slice(MAX_THUMBNAIL_SERIES);
  const chartSeries: Record<string, DailyPoint[]> = Object.fromEntries(own.map((t) => [`t${t.rank}`, t.daily]));
  if (rest.length > 0) chartSeries.other = mergePoints(rest.map((t) => t.daily));

  return (
    <div className="space-y-4">
      {note}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Thumbnail impressions" value={formatCompact(total)} source="live" icon={Eye} hint={`All thumbnails, ${range.label}`} />
        <StatCard
          label="Thumbnails shown"
          value={String(shown)}
          source="live"
          icon={Images}
          hint={shown > 1 ? "Roblox rotates them per player" : "A single thumbnail is in use"}
        />
        <StatCard
          label="Qualified play-through"
          value={pct(overallQualifiedPtr(thumbnails))}
          source="live"
          icon={Target}
          hint="Weighted by impressions"
        />
        <StatCard
          label="Best thumbnail"
          value={best ? `#${best.rank}` : "—"}
          source="live"
          icon={Trophy}
          hint={best ? `${pct(best.qualifiedPtr)} qualified play-through` : "Needs two thumbnails with enough impressions"}
        />
      </div>

      <MetricChart
        title="Impressions by thumbnail"
        description={`Daily impressions of each thumbnail, ${range.label}`}
        label={`Daily impressions per thumbnail, ${range.label}`}
        format="compact"
        variant="line"
        rows={rowsOf(chartSeries)}
        series={[
          ...own.map((t) => ({ key: `t${t.rank}`, label: `Thumbnail #${t.rank}`, color: t.color })),
          ...(rest.length > 0 ? [{ key: "other", label: "Other thumbnails", color: rest[0]?.color }] : []),
        ]}
        source="live"
        granularity="day"
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Thumbnails">
        {thumbnails.map((t) => (
          <li key={t.assetId}>
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-surface-2">
                {t.imageUrl ? (
                  <Image src={t.imageUrl} alt={`Thumbnail #${t.rank}`} fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-fg-3">
                    <ImageOff className="size-6" aria-hidden />
                    <span className="sr-only">Image unavailable</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-fg">
                    <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: t.color }} />
                    Thumbnail #{t.rank}
                  </h3>
                  {best?.assetId === t.assetId ? (
                    <Badge tone="good" icon={<Trophy aria-hidden />}>
                      Best conversion
                    </Badge>
                  ) : null}
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3">Impressions</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{formatCompact(t.impressions)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3">Share</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{formatPercent(t.share)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3" title="Qualified play-through rate">
                      Qualified PTR
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{pct(t.qualifiedPtr)}</dd>
                  </div>
                </dl>
                <Progress value={t.share * 100} label={`Thumbnail #${t.rank} share of impressions`} />
                <p className="font-mono text-[11px] text-fg-3">Asset {t.assetId}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-fg-3">Roblox Analytics · thumbnail data kept 30 days · about one day behind, refreshed hourly.</p>
    </div>
  );
}
