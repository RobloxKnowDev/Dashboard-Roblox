"use client";

import { Check, ChevronsUpDown, Gamepad2, LayoutDashboard, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { StatusDot } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAME_STATUS } from "@/features/shared/status";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { Database } from "@/types/database";

export type SwitcherGame = {
  id: string;
  name: string;
  iconUrl: string | null;
  status: Database["public"]["Enums"]["game_status"];
};

function GameThumb({ game, size = 20 }: { game: Pick<SwitcherGame, "name" | "iconUrl">; size?: number }) {
  return game.iconUrl ? (
    <Image src={game.iconUrl} alt="" width={size} height={size} unoptimized className="shrink-0 rounded-[5px] object-cover ring-1 ring-line-strong" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-[5px] bg-surface-3 text-fg-3 ring-1 ring-line-strong" style={{ width: size, height: size }} aria-hidden>
      <Gamepad2 className="size-3" />
    </span>
  );
}

function Switcher({ games, currentId }: { games: SwitcherGame[]; currentId: string | null }) {
  const t = useT();
  const s = t.shell.gameSwitcher;
  const current = games.find((g) => g.id === currentId) ?? null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={s.label}
        className="flex h-9 max-w-[16rem] items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-2 data-[state=open]:border-line-strong"
      >
        {current ? (
          <GameThumb game={current} />
        ) : (
          <span className="flex -space-x-1.5" aria-hidden>
            {games.length ? games.slice(0, 3).map((g) => <GameThumb key={g.id} game={g} size={18} />) : <GameThumb game={{ name: "", iconUrl: null }} />}
          </span>
        )}
        <span className="truncate">{current ? current.name : s.allGames}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-fg-3" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem asChild>
          <Link href="/overview" className="h-auto py-2">
            <LayoutDashboard />
            <span className="min-w-0 flex-1">
              <span className="block text-fg">{s.studioView}</span>
              <span className="block text-[11px] text-fg-3">{s.studioViewHint}</span>
            </span>
            {current ? null : <Check className="text-accent-ink!" />}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{s.yourGames}</DropdownMenuLabel>
        {games.length === 0 ? <p className="px-2 py-1.5 text-xs text-fg-3">{s.empty}</p> : null}
        {games.map((game) => (
          <DropdownMenuItem key={game.id} asChild>
            <Link href={`/games/${game.id}`}>
              <GameThumb game={game} />
              <span className="min-w-0 flex-1 truncate">{game.name}</span>
              <StatusDot tone={GAME_STATUS[game.status].tone} label={t.common.status.game[game.status]} />
              {game.id === currentId ? <Check className="text-accent-ink!" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/games">
            <Settings2 />
            {s.manage}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActiveSwitcher({ games }: { games: SwitcherGame[] }) {
  const pathname = usePathname();
  const currentId = /\/games\/([0-9a-f-]{36})/i.exec(pathname)?.[1] ?? null;
  return <Switcher games={games} currentId={currentId} />;
}

/**
 * "Which game am I looking at?" — top-left of every page, like a creator
 * switcher: the studio view (all games) or one game's page. The current game
 * comes from the URL, unknown while prerendering: the fallback shows "All games".
 */
export function GameSwitcher({ games, className }: { games: SwitcherGame[] | null; className?: string }) {
  if (!games) return null;
  return (
    <div className={cn("min-w-0", className)}>
      <Suspense fallback={<Switcher games={games} currentId={null} />}>
        <ActiveSwitcher games={games} />
      </Suspense>
    </div>
  );
}
