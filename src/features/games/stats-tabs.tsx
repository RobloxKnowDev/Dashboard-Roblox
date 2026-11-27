"use client";

import { LoaderCircle } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_GAME_TAB, GAME_TABS, parseGameTab, type GameTab } from "./tabs";

const TAB_CLASS =
  "relative -mb-px inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent text-[13px] font-medium text-fg-3 transition-colors hover:text-fg-2 focus-visible:outline-offset-0";

function PendingHint() {
  const { pending } = useLinkStatus();
  return <LoaderCircle aria-hidden className={cn("absolute -right-4 top-1/2 size-3 -translate-y-1/2 animate-spin text-fg-3 transition-opacity", pending ? "opacity-100" : "opacity-0")} />;
}

function TabRow({ active, hrefFor }: { active: GameTab | null; hrefFor: (tab: GameTab) => string }) {
  const t = useT();
  return (
    <nav aria-label={t.games.tabs.ariaLabel} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex items-center gap-5 border-b border-line">
        {GAME_TABS.map((tab) => {
          const current = tab.value === active;
          return (
            <li key={tab.value}>
              {/* No prefetch: opening a tab queries Roblox, which meters every data point. */}
              <Link
                href={hrefFor(tab.value)}
                prefetch={false}
                scroll={false}
                replace
                aria-current={current ? "page" : undefined}
                className={cn(TAB_CLASS, current && "border-accent text-fg")}
              >
                {t.games.tabs[tab.value]}
                <PendingHint />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Performance · Acquisition · Thumbnails. The tab lives in the URL (?tab=), next to ?range=. */
export function GameStatsTabs() {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = parseGameTab(params.get("tab"));

  function hrefFor(tab: GameTab) {
    const next = new URLSearchParams(params);
    if (tab === DEFAULT_GAME_TAB) next.delete("tab");
    else next.set("tab", tab);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return <TabRow active={active} hrefFor={hrefFor} />;
}

/** Prerender fallback (the URL isn't known yet): same row, nothing highlighted. */
export function GameStatsTabsFallback() {
  return <TabRow active={null} hrefFor={(tab) => (tab === DEFAULT_GAME_TAB ? "?" : `?tab=${tab}`)} />;
}
