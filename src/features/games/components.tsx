import { ChevronRight, Gamepad2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge, StatusDot } from "@/components/ui/badge";
import { GAME_STATUS } from "@/features/shared/status";
import { likeRatio, type RobloxGameInfo } from "@/lib/integrations/roblox/public";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils/cn";
import type { GameRow } from "./data";

export function GameIcon({ src, name, size = 56 }: { src: string | null | undefined; name: string; size?: number }) {
  return src ? (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-lg border border-line-strong bg-surface-2 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      title={name}
      className="flex shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-3"
      style={{ width: size, height: size }}
    >
      <Gamepad2 className="size-5" />
    </span>
  );
}

export function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="truncate text-[11px] text-fg-3">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular">{value}</dd>
    </div>
  );
}

type GameCardProps = {
  game: GameRow;
  roblox: RobloxGameInfo | null | undefined;
  /** Latest daily active users from Roblox analytics, or a reason it's missing. */
  dau: { value: number | null; status: "ok" | "unauthorized" | "not_configured" | "error" };
};

export async function GameCard({ game, roblox, dau }: GameCardProps) {
  const { t, f } = await getI18n();
  const status = GAME_STATUS[game.status];
  const rating = roblox ? likeRatio(roblox) : null;

  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col rounded-lg border border-line bg-surface transition-colors hover:border-line-strong hover:bg-surface-2/40"
    >
      <div className="flex items-start gap-3.5 p-4">
        <GameIcon src={roblox?.iconUrl ?? game.thumbnail_url} name={game.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-fg">{roblox?.name ?? game.name}</h3>
            <Badge tone={status.tone} dot className="shrink-0">
              {t.common.status.game[game.status]}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-3">{roblox?.genre ?? game.genre ?? "—"}</p>
          <p className="mt-1.5 font-mono text-[11px] text-fg-3">{t.games.card.universe(String(game.universe_id))}</p>
        </div>
      </div>

      <dl className="grid grid-cols-4 gap-3 border-t border-line px-4 py-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 truncate text-[11px] text-fg-3">
            <StatusDot tone={roblox && roblox.playing > 0 ? "good" : "neutral"} pulse={!!roblox && roblox.playing > 0} />
            {t.games.card.playing}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-fg tabular">{roblox ? f.formatNumber(roblox.playing) : "—"}</dd>
        </div>
        <Stat label={t.games.card.visits} value={roblox ? f.formatCompact(roblox.visits) : "—"} />
        <Stat label={t.games.card.favorites} value={roblox ? f.formatCompact(roblox.favorites) : "—"} />
        <Stat label={t.games.card.rating} value={rating === null ? "—" : f.formatPercent(rating)} />
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs">
        {dau.status === "ok" ? (
          <span className="text-fg-3">
            {t.games.card.dau}{" "}
            <span className="font-semibold text-fg tabular">{dau.value === null ? "—" : f.formatNumber(Math.round(dau.value))}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-fg-3">
            <LockKeyhole className="size-3" aria-hidden />
            {dau.status === "unauthorized"
              ? t.games.card.analyticsUnauthorized
              : dau.status === "not_configured"
                ? t.games.card.analyticsNotConfigured
                : t.games.card.analyticsError}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 text-fg-3 transition-colors group-hover:text-accent">
          {t.common.actions.details}
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
