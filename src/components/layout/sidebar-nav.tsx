"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { findNavItem, navigation, type NavSection } from "@/config/navigation";
import { useT } from "@/i18n/client";
import { hasMinRole, type AppRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils/cn";
import { SidebarCollapsedContext } from "./sidebar-context";

type SidebarNavProps = {
  /** When known, items above the user's role are hidden. */
  role?: AppRole | null;
};

function visibleSections(role?: AppRole | null): NavSection[] {
  if (role === undefined) return navigation;
  return navigation
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.minRole || (role !== null && hasMinRole(role, item.minRole))) }))
    .filter((section) => section.items.length > 0);
}

function NavList({ activeHref, role }: SidebarNavProps & { activeHref: string | null }) {
  const collapsed = use(SidebarCollapsedContext);
  const t = useT();
  return (
    <nav aria-label={t.shell.sidebar.mainNav} className="flex flex-col gap-5">
      {visibleSections(role).map((section, index) => (
        <div key={section.key}>
          {index === 0 ? null : collapsed ? (
            <div className="mx-auto mb-2 h-px w-5 bg-line" aria-hidden />
          ) : (
            <p className="mb-1 px-3 text-[11px] font-medium text-fg-3">{t.nav.sections[section.key]}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              const title = t.nav.items[item.key].title;
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-md text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-0" : "px-3",
                    active ? "bg-accent-soft text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn("size-[18px] shrink-0 transition-colors", active ? "text-accent-ink" : "text-fg-3 group-hover:text-fg-2")}
                    aria-hidden
                  />
                  {collapsed ? <span className="sr-only">{title}</span> : <span className="truncate">{title}</span>}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip content={title} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ActiveNavList(props: SidebarNavProps) {
  const pathname = usePathname();
  return <NavList {...props} activeHref={findNavItem(pathname)?.href ?? null} />;
}

/**
 * Main navigation. The active-link highlight depends on the URL, which isn't
 * known while prerendering dynamic routes — the fallback renders the same
 * list without highlight, so nothing shifts.
 */
export function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense fallback={<NavList {...props} activeHref={null} />}>
      <ActiveNavList {...props} />
    </Suspense>
  );
}
