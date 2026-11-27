"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/client";
import { Logo } from "./logo";
import { SidebarCollapsedContext } from "./sidebar-context";

const STORAGE_KEY = "sidebar:collapsed";
const CHANGE_EVENT = "sidebar:change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY) === "1",
    () => false,
  );
  const toggle = () => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [collapsed, toggle];
}

/**
 * Permanent left sidebar (desktop). On small screens, see <MobileNav>.
 * `nav` is the (session-aware) navigation, rendered by the server layout.
 */
export function Sidebar({ nav }: { nav: ReactNode }) {
  const [collapsed, toggle] = useCollapsed();
  const t = useT();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[60px]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center", collapsed ? "justify-center" : "px-4")}>
        <Link href="/overview" className="rounded-md" aria-label={t.shell.sidebar.goToOverview}>
          <Logo collapsed={collapsed} />
        </Link>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto pb-4 pt-2", collapsed ? "px-2" : "px-3")}>
        <SidebarCollapsedContext value={collapsed}>{nav}</SidebarCollapsedContext>
      </div>

      <div className={cn("flex h-12 shrink-0 items-center border-t border-line", collapsed ? "justify-center" : "justify-between px-4")}>
        {collapsed ? null : <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3">{t.shell.sidebar.version}</span>}
        <Tooltip content={collapsed ? t.shell.sidebar.expand : t.shell.sidebar.collapse} side="right">
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? t.shell.sidebar.expand : t.shell.sidebar.collapse}
            aria-expanded={!collapsed}
            className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
