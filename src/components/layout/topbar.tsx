"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { findNavItem, navigation } from "@/config/navigation";
import { useT } from "@/i18n/client";
import { CommandPaletteTrigger } from "./command-palette";
import { MobileNav } from "./mobile-nav";

function Breadcrumb() {
  const pathname = usePathname();
  const t = useT();
  const item = findNavItem(pathname);
  const section = navigation.find((s) => s.items.some((i) => i.href === item?.href));
  if (!item || !section) return null;
  const sectionTitle = t.nav.sections[section.key];
  const itemTitle = t.nav.items[item.key].title;
  return (
    <nav aria-label={t.shell.breadcrumb} className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
      {sectionTitle !== itemTitle ? (
        <>
          <span className="truncate text-fg-3">{sectionTitle}</span>
          <ChevronRight className="size-3.5 shrink-0 text-fg-4" aria-hidden />
        </>
      ) : null}
      <span className="truncate font-medium text-fg-2">{itemTitle}</span>
    </nav>
  );
}

type TopbarProps = {
  /** Navigation shown in the mobile drawer. */
  nav: ReactNode;
  /** Right-side slot for session-dependent widgets (notifications, user menu). */
  actions?: ReactNode;
};

export function Topbar({ nav, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md md:px-6">
      <MobileNav nav={nav} />
      <Suspense fallback={null}>
        <Breadcrumb />
      </Suspense>
      <div className="ml-auto flex items-center gap-1.5">
        <CommandPaletteTrigger className="w-40 sm:w-60" />
        {actions}
      </div>
    </header>
  );
}
