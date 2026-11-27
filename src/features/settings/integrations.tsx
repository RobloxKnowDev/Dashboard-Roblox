import { CalendarClock, CircleCheck, CircleDashed, Database, Gamepad2, ChartLine, Sparkles, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listGames } from "@/features/games/data";
import { getStudioMetrics } from "@/features/overview/studio";
import { getI18n } from "@/i18n/server";
import { environmentStatus, robloxKeyCount } from "@/lib/env-status";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { getAssistantMode } from "@/features/assistant/provider";
import { createClient } from "@/lib/supabase/server";

/*
 * LIVE status of every connection, computed on each visit. Shows whether a
 * key is configured — never its value.
 */

type Status = { label: string; tone: BadgeTone; icon: LucideIcon };
const OK = (label: string): Status => ({ label, tone: "good", icon: CircleCheck });
const WARN = (label: string): Status => ({ label, tone: "warning", icon: TriangleExclamationPoint });
const OFF = (label: string): Status => ({ label, tone: "neutral", icon: CircleDashed });

function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
  details,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  status: Status;
  details: { label: string; value: ReactNode }[];
}) {
  const StatusIcon = status.icon;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-fg-2">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-fg">{name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-3">{description}</p>
        </div>
        <Badge tone={status.tone} icon={<StatusIcon aria-hidden />}>
          {status.label}
        </Badge>
      </div>
      <dl className="mt-auto space-y-1.5 border-t border-line pt-3 text-xs">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between gap-3">
            <dt className="text-fg-3">{d.label}</dt>
            <dd className="min-w-0 text-right text-fg-2">{d.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

async function lastSnapshotDay(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("market_snapshots").select("recorded_on").order("recorded_on", { ascending: false }).limit(1).maybeSingle();
  return data?.recorded_on ?? null;
}

export async function IntegrationsOverview() {
  await connection();
  const { t, f } = await getI18n();
  const s = t.integrations.status;
  const val = t.integrations.values;
  const today = new Date().toISOString().slice(0, 10);
  const env = Object.fromEntries(environmentStatus().map((v) => [v.name, v.configured]));
  const assistantMode = await getAssistantMode(new Date());
  const keys = robloxKeyCount();

  const games = (await listGames())?.filter((g) => g.status !== "archived") ?? [];
  const [roblox, studio, lastSnapshot] = await Promise.all([
    games.length ? getRobloxGames(games.map((g) => g.universe_id)) : Promise.resolve(new Map()),
    keys > 0 && games.length ? getStudioMetrics("30d", today) : Promise.resolve(null),
    lastSnapshotDay(),
  ]);

  const readable = studio?.status === "ok" ? studio.analyticsCount : 0;
  const unauthorized = studio?.status === "ok" ? studio.unauthorized.map((g) => g.name) : [];
  const snapshotAge = lastSnapshot ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastSnapshot}T00:00:00Z`)) / 86_400_000) : null;

  const analyticsStatus =
    keys === 0
      ? OFF(s.noKey)
      : games.length === 0
        ? WARN(s.noGames)
        : readable === games.length
          ? OK(s.connected)
          : readable > 0
            ? WARN(s.partial)
            : WARN(s.noAccess);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <IntegrationCard
        icon={Gamepad2}
        name={t.integrations.robloxPublic.name}
        description={t.integrations.robloxPublic.description}
        status={roblox === null ? WARN(s.unreachable) : OK(s.connected)}
        details={[
          { label: t.integrations.robloxPublic.gamesTracked, value: games.length },
          {
            label: t.integrations.robloxPublic.usedBy,
            value: [t.nav.items.games.title, t.nav.items.overview.title, t.nav.items.discover.title].join(", "),
          },
        ]}
      />
      <IntegrationCard
        icon={ChartLine}
        name={t.integrations.analytics.name}
        description={t.integrations.analytics.description}
        status={analyticsStatus}
        details={[
          { label: t.integrations.analytics.keys, value: keys },
          { label: t.integrations.analytics.readable, value: games.length ? val.readableOf(readable, games.length) : "—" },
          ...(unauthorized.length ? [{ label: t.integrations.analytics.notReadable, value: unauthorized.join(", ") }] : []),
        ]}
      />
      <IntegrationCard
        icon={CalendarClock}
        name={t.integrations.snapshots.name}
        description={t.integrations.snapshots.description}
        status={
          !env.CRON_SECRET || !env.SUPABASE_SECRET_KEY
            ? WARN(s.setupIncomplete)
            : snapshotAge !== null && snapshotAge <= 1
              ? OK(s.running)
              : WARN(s.noRecentRun)
        }
        details={[
          { label: t.integrations.snapshots.last, value: lastSnapshot ? f.formatDate(lastSnapshot) : val.never },
          { label: t.integrations.snapshots.jobSecret, value: env.CRON_SECRET ? val.configured : val.missing },
          { label: t.integrations.snapshots.serverKey, value: env.SUPABASE_SECRET_KEY ? val.configured : val.missing },
        ]}
      />
      <IntegrationCard
        icon={Sparkles}
        name={t.integrations.claude.name}
        description={t.integrations.claude.description}
        status={env.ANTHROPIC_API_KEY ? OK(s.connected) : OFF(s.noKey)}
        details={[
          { label: t.integrations.claude.apiKey, value: env.ANTHROPIC_API_KEY ? val.configured : val.notConfigured },
          {
            label: t.integrations.claude.mode,
            value: !env.ANTHROPIC_API_KEY ? val.demo : assistantMode === "live" ? val.live : assistantMode === "disabled" ? val.off : val.paused,
          },
          { label: t.integrations.claude.models, value: "Haiku 5.5 · Opus 5.5" },
        ]}
      />
      <IntegrationCard
        icon={Database}
        name={t.integrations.supabase.name}
        description={t.integrations.supabase.description}
        status={OK(s.connected)}
        details={[
          {
            label: t.integrations.supabase.publicKeys,
            value: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? val.configured : val.missing,
          },
          { label: t.integrations.supabase.secretKey, value: env.SUPABASE_SECRET_KEY ? val.configured : val.missing },
        ]}
      />
    </div>
  );
}
