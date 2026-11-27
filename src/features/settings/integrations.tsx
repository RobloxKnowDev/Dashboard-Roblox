import { CalendarClock, CircleCheck, CircleDashed, Database, Gamepad2, ChartLine, Sparkles, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listGames } from "@/features/games/data";
import { getStudioMetrics } from "@/features/overview/studio";
import { environmentStatus, robloxKeyCount } from "@/lib/env-status";
import { getRobloxGames } from "@/lib/integrations/roblox/public";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";

/*
 * LIVE status of every connection, computed on each visit. Shows whether a
 * key is configured — never its value.
 */

type Status = { label: string; tone: BadgeTone; icon: LucideIcon };
const OK = (label = "Connected"): Status => ({ label, tone: "good", icon: CircleCheck });
const WARN = (label: string): Status => ({ label, tone: "warning", icon: TriangleExclamationPoint });
const OFF = (label = "Not connected"): Status => ({ label, tone: "neutral", icon: CircleDashed });

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
  const today = new Date().toISOString().slice(0, 10);
  const env = Object.fromEntries(environmentStatus().map((v) => [v.name, v.configured]));
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
    keys === 0 ? OFF("No key") : games.length === 0 ? WARN("No games") : readable === games.length ? OK() : readable > 0 ? WARN("Partial") : WARN("No access");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <IntegrationCard
        icon={Gamepad2}
        name="Roblox public stats"
        description="Players online, visits, favorites, ratings and the Roblox charts. No key needed."
        status={roblox === null ? WARN("Unreachable") : OK()}
        details={[
          { label: "Games tracked", value: games.length },
          { label: "Used by", value: "My Games, Overview, Discover" },
        ]}
      />
      <IntegrationCard
        icon={ChartLine}
        name="Roblox Open Cloud analytics"
        description="DAU, revenue, retention and playtime, read with your Open Cloud API keys (one per Roblox group)."
        status={analyticsStatus}
        details={[
          { label: "API keys configured", value: keys },
          { label: "Games readable", value: games.length ? `${readable} of ${games.length}` : "—" },
          ...(unauthorized.length ? [{ label: "Not readable", value: unauthorized.join(", ") }] : []),
        ]}
      />
      <IntegrationCard
        icon={CalendarClock}
        name="Daily snapshots"
        description="A scheduled job records the Roblox charts, your watchlist and your games every day at 06:00 UTC to build history."
        status={!env.CRON_SECRET || !env.SUPABASE_SECRET_KEY ? WARN("Setup incomplete") : snapshotAge !== null && snapshotAge <= 1 ? OK("Running") : WARN("No recent run")}
        details={[
          { label: "Last snapshot", value: lastSnapshot ? formatDate(lastSnapshot) : "Never" },
          { label: "Job secret", value: env.CRON_SECRET ? "Configured" : "Missing" },
          { label: "Server key", value: env.SUPABASE_SECRET_KEY ? "Configured" : "Missing" },
        ]}
      />
      <IntegrationCard
        icon={Sparkles}
        name="Claude (AI Assistant)"
        description="Answers questions about your studio from your real data. The assistant runs in demo mode until it's connected."
        status={OFF()}
        details={[
          { label: "API key", value: env.ANTHROPIC_API_KEY ? "Configured" : "Not configured" },
          { label: "Assistant mode", value: "Demo" },
        ]}
      />
      <IntegrationCard
        icon={Database}
        name="Supabase"
        description="Database, authentication and access rules (row-level security) for every page."
        status={OK()}
        details={[
          { label: "Public keys", value: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "Configured" : "Missing" },
          { label: "Secret key", value: env.SUPABASE_SECRET_KEY ? "Configured" : "Missing" },
        ]}
      />
    </div>
  );
}
