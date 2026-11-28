"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { settingsSections } from "./sections";

function NavList({ activeSlug }: { activeSlug: string | null }) {
  const t = useT();
  return (
    <nav aria-label={t.nav.items.settings.title}>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {settingsSections.map((section) => {
          const active = section.slug === activeSlug;
          const Icon = section.icon;
          return (
            <li key={section.slug} className="shrink-0">
              <Link
                href={`/settings/${section.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium transition-colors",
                  active ? "bg-surface-2 text-fg" : "text-fg-3 hover:bg-surface-2/60 hover:text-fg-2",
                )}
              >
                <Icon className={cn("size-4", active ? "text-accent-ink" : "text-fg-3")} aria-hidden />
                {t.settings.sections[section.slug].title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ActiveNavList() {
  const pathname = usePathname();
  const slug = pathname.split("/")[2] ?? null;
  return <NavList activeSlug={slug} />;
}

export function SettingsNav() {
  return (
    <Suspense fallback={<NavList activeSlug={null} />}>
      <ActiveNavList />
    </Suspense>
  );
}
