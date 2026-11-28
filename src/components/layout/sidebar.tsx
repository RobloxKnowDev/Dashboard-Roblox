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

/** Collapsed (icons only) or open, remembered in the browser; shared by the sidebar and its toggle. */
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

/** Top-left button of the top bar (desktop): folds the sidebar down to its icons, or opens it again. */
export function SidebarToggle() {
  const [collapsed, toggle] = useCollapsed();
  const t = useT();
  const label = collapsed ? t.shell.sidebar.expand : t.shell.sidebar.collapse;
  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={!collapsed}
        className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg lg:flex"
      >
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
      </button>
    </Tooltip>
  );
}

/**
 * Permanent left sidebar (desktop). On small screens, see <MobileNav>.
 * `nav` is the (session-aware) navigation, rendered by the server layout.
 */
export function Sidebar({ nav }: { nav: ReactNode }) {
  const [collapsed] = useCollapsed();
  const t = useT();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[64px]" : "w-60",
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

      {collapsed ? null : (
        <div className="flex h-12 shrink-0 items-center border-t border-line px-4">
          <span className="text-[11px] text-fg-3">{t.shell.sidebar.version}</span>
        </div>
      )}
    </aside>
  );
}
