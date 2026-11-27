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
import { getI18n } from "@/i18n/server";
import type { DailyPoint } from "@/lib/integrations/roblox/analytics";
import type { Formatters } from "@/lib/utils/format";
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

/** Some queries failed — almost always Roblox's (unpublished) data-point budget. */
function RateLimitNote({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
      <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

const percentOrDash = (f: Formatters) => (value: number | null) => (value === null ? "—" : f.formatPrecisePercent(value));

/* ───────────────────────────── Acquisition ───────────────────────────── */

export async function GameAcquisitionSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const { t, f, locale } = await getI18n();
  const requested = parseRange((await searchParams).range, locale);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const data = await getGameAcquisition(game.universe_id, requested, today, locale);

  if (data.status !== "ok") return <AnalyticsUnavailable status={data.status} universeId={game.universe_id} />;

  const a = t.games.acquisition;
  const pct = percentOrDash(f);
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
      {data.capped ? <RangeNote>{a.capped}</RangeNote> : null}
      {anyFailed ? <RateLimitNote text={a.rateLimit} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={a.reached} value={f.formatCompact(reachTotal)} source="live" icon={Eye} hint={a.reachedHint(range.label)} />
        <StatCard
          label={a.ctr}
          value={pct(ctrNow)}
          source="live"
          icon={MousePointerClick}
          delta={deltaOf(ctrNow, avgOf(data.impressionCtr.previous))}
          deltaLabel={range.comparison}
          hint={a.ctrHint}
        />
        <StatCard
          label={a.qptr}
          value={pct(qptrNow)}
          source="live"
          icon={Target}
          delta={deltaOf(qptrNow, avgOf(data.qualifiedPtr.previous))}
          deltaLabel={range.comparison}
          hint={a.qptrHint}
        />
        <StatCard
          label={a.bounce}
          value={bounceNow === null ? "—" : f.formatPercent(bounceNow)}
          source="live"
          icon={DoorOpen}
          delta={deltaOf(bounceNow, avgOf(data.bounce60.previous))}
          deltaLabel={range.comparison}
          upIsGood={false}
          hint={a.bounceHint}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex flex-col xl:col-span-2">
          <CardHeader title={a.bySourceTitle} description={a.bySourceDescription(range.label)} actions={<SourceBadge source="live" />} />
          <div className="mt-3 flex-1">
            {sources.length === 0 ? (
              <EmptyState
                compact
                title={failed.sources ? a.couldntLoad : t.common.states.noDataPeriod}
                description={failed.sources ? a.failedMessage : a.noSources}
              />
            ) : (
              <Table>
                <caption className="sr-only">{a.tableCaption(range.label)}</caption>
                <THead>
                  <TR>
                    <TH>{a.colSource}</TH>
                    <TH className="text-right">{a.colReached}</TH>
                    <TH className="text-right">{a.colShare}</TH>
                    <TH className="text-right">{a.colPlayed}</TH>
                    <TH className="text-right">{a.colPlayRate}</TH>
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
                      <TD className="text-right tabular">{f.formatCompact(s.reachedTotal)}</TD>
                      <TD className="text-right tabular text-fg-3">{reachTotal > 0 ? f.formatPercent(s.reachedTotal / reachTotal) : "—"}</TD>
                      <TD className="text-right tabular">{f.formatCompact(s.playedTotal)}</TD>
                      <TD className="text-right tabular">{s.playRate === null ? <span className="text-fg-3">—</span> : f.formatPrecisePercent(s.playRate)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-fg-3">{a.playedFootnote(f.formatCompact(playedTotal))}</p>
        </Card>

        <MetricChart
          title={a.reachTitle}
          description={a.reachDescription}
          label={a.reachLabel(range.label)}
          format="compact"
          variant="line"
          rows={rowsOf(Object.fromEntries(sources.map((s) => [s.key, s.reached])))}
          series={sourceSeries}
          emptyMessage={failed.sources ? a.failedMessage : a.reachEmpty}
          {...common}
        />
        <MetricChart
          title={a.playersTitle}
          description={a.playersDescription}
          label={a.playersLabel(range.label)}
          format="compact"
          variant="line"
          rows={rowsOf(Object.fromEntries(sources.map((s) => [s.key, s.played])))}
          series={sourceSeries}
          emptyMessage={failed.sources ? a.failedMessage : undefined}
          {...common}
        />
        <MetricChart
          title={a.conversionTitle}
          description={a.conversionDescription}
          label={a.conversionLabel(range.label)}
          format="percent"
          variant="line"
          rows={rowsOf({ ctr: data.impressionCtr.current, qptr: data.qualifiedPtr.current, reco: data.recoPtr })}
          series={[
            { key: "ctr", label: a.ctr },
            { key: "qptr", label: a.qptr },
            { key: "reco", label: a.recoSeries },
          ]}
          emptyMessage={failed.conversion ? a.failedMessage : undefined}
          {...common}
        />
        <MetricChart
          title={a.bounceTitle}
          description={a.bounceDescription}
          label={a.bounceLabel(range.label)}
          format="percent"
          variant="line"
          rows={rowsOf({ b60: data.bounce60.current, b180: data.bounce180 })}
          series={[
            { key: "b60", label: a.b60 },
            { key: "b180", label: a.b180 },
          ]}
          emptyMessage={failed.bounce ? a.failedMessage : a.bounceEmpty}
          {...common}
        />
        <div className="xl:col-span-2">
          <MetricChart
            title={a.newReturningTitle}
            description={activeTotal > 0 ? a.newShare(f.formatPercent(newTotal / activeTotal), range.label) : a.newReturningDescription}
            label={a.newReturningLabel(range.label)}
            format="compact"
            variant="line"
            rows={rowsOf({ new: data.newPlayers, returning: data.returningPlayers })}
            series={[
              { key: "new", label: a.newSeries },
              { key: "returning", label: a.returningSeries },
            ]}
            emptyMessage={failed.newReturning ? a.failedMessage : undefined}
            {...common}
          />
        </div>
      </div>
      <p className="text-[11px] text-fg-3">{a.footnote}</p>
    </div>
  );
}

/* ───────────────────────────── Thumbnails ───────────────────────────── */

export async function GameThumbnailsSection({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const game = await loadGame(params);
  const { t, f, locale } = await getI18n();
  const requested = parseRange((await searchParams).range, locale);
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  const data = await getGameThumbnails(game.universe_id, requested, today, locale);

  if (data.status !== "ok") return <AnalyticsUnavailable status={data.status} universeId={game.universe_id} />;

  const th = t.games.thumbnails;
  const pct = percentOrDash(f);
  const { range, thumbnails } = data;
  const note = (
    <>
      {data.capped ? <RangeNote>{th.capped}</RangeNote> : null}
      {data.incomplete ? <RateLimitNote text={t.games.acquisition.rateLimit} /> : null}
    </>
  );

  if (thumbnails.length === 0) {
    return (
      <div className="space-y-4">
        {note}
        <Card>
          <EmptyState
            icon={Images}
            title={data.incomplete ? t.games.acquisition.couldntLoad : th.emptyTitle}
            description={data.incomplete ? t.games.acquisition.failedMessage : th.emptyDescription}
          />
        </Card>
      </div>
    );
  }

  const total = thumbnails.reduce((acc, item) => acc + item.impressions, 0);
  const shown = thumbnails.filter((item) => item.impressions > 0).length;
  const best = bestThumbnail(thumbnails);
  const own = thumbnails.slice(0, MAX_THUMBNAIL_SERIES);
  const rest = thumbnails.slice(MAX_THUMBNAIL_SERIES);
  const chartSeries: Record<string, DailyPoint[]> = Object.fromEntries(own.map((item) => [`t${item.rank}`, item.daily]));
  if (rest.length > 0) chartSeries.other = mergePoints(rest.map((item) => item.daily));

  return (
    <div className="space-y-4">
      {note}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={th.impressions} value={f.formatCompact(total)} source="live" icon={Eye} hint={th.impressionsHint(range.label)} />
        <StatCard
          label={th.shown}
          value={String(shown)}
          source="live"
          icon={Images}
          hint={shown > 1 ? th.shownRotating : th.shownSingle}
        />
        <StatCard
          label={t.games.acquisition.qptr}
          value={pct(overallQualifiedPtr(thumbnails))}
          source="live"
          icon={Target}
          hint={th.qptrHint}
        />
        <StatCard
          label={th.best}
          value={best ? `#${best.rank}` : "—"}
          source="live"
          icon={Trophy}
          hint={best ? th.bestHint(pct(best.qualifiedPtr)) : th.bestNone}
        />
      </div>

      <MetricChart
        title={th.chartTitle}
        description={th.chartDescription(range.label)}
        label={th.chartLabel(range.label)}
        format="compact"
        variant="line"
        rows={rowsOf(chartSeries)}
        series={[
          ...own.map((item) => ({ key: `t${item.rank}`, label: th.thumbnail(item.rank), color: item.color })),
          ...(rest.length > 0 ? [{ key: "other", label: th.otherThumbnails, color: rest[0]?.color }] : []),
        ]}
        source="live"
        granularity="day"
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={th.listLabel}>
        {thumbnails.map((item) => (
          <li key={item.assetId}>
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-surface-2">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={th.thumbnail(item.rank)} fill unoptimized sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-fg-3">
                    <ImageOff className="size-6" aria-hidden />
                    <span className="sr-only">{th.imageUnavailable}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-fg">
                    <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                    {th.thumbnail(item.rank)}
                  </h3>
                  {best?.assetId === item.assetId ? (
                    <Badge tone="good" icon={<Trophy aria-hidden />}>
                      {th.bestConversion}
                    </Badge>
                  ) : null}
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3">{th.colImpressions}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{f.formatCompact(item.impressions)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3">{th.colShare}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{f.formatPercent(item.share)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] text-fg-3" title={th.colQptrTitle}>
                      {th.colQptr}
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{pct(item.qualifiedPtr)}</dd>
                  </div>
                </dl>
                <Progress value={item.share * 100} label={th.shareLabel(item.rank)} />
                <p className="font-mono text-[11px] text-fg-3">{th.asset(item.assetId)}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-fg-3">{th.footnote}</p>
    </div>
  );
}
