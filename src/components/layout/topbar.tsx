"use client";

import type { ReactNode } from "react";
import { CommandPaletteTrigger } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { SidebarToggle } from "./sidebar";

type TopbarProps = {
  /** Navigation shown in the mobile drawer. */
  nav: ReactNode;
  /** Left slot: the game switcher (session-dependent). */
  switcher?: ReactNode;
  /** Right-side slot for session-dependent widgets (notifications, user menu). */
  actions?: ReactNode;
};

export function Topbar({ nav, switcher, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md md:px-6">
      <MobileNav nav={nav} />
      <SidebarToggle />
      {switcher}
      <div className="ml-auto flex items-center gap-1.5">
        <CommandPaletteTrigger className="w-10 sm:w-60" />
        {actions}
      </div>
    </header>
  );
}
