import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/states";
import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";
import {
  AccessGate,
  SessionGameSwitcher,
  SessionNotifications,
  SessionSidebarNav,
  SessionUserMenu,
} from "@/components/layout/session-widgets";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { Skeleton } from "@/components/ui/primitives";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getT } from "@/i18n/server";

/**
 * Private application shell. The frame (sidebar, topbar, search) is static
 * and prerendered; everything that depends on the session streams in behind
 * its own <Suspense> boundary. Every page passes through <AccessGate>, which
 * verifies the user on the server (the proxy already redirected anonymous
 * visitors; RLS remains the final barrier on data).
 */
export default async function AppLayout({ children }: LayoutProps<"/[lang]">) {
  const t = await getT();
  const nav = (
    <Suspense fallback={<SidebarNav />}>
      <SessionSidebarNav />
    </Suspense>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <CommandPaletteProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-accent-fg"
        >
          {t.shell.skipToContent}
        </a>
        <div className="flex min-h-dvh">
          <Sidebar nav={nav} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              nav={nav}
              switcher={
                <Suspense fallback={<Skeleton className="h-9 w-40 rounded-lg" />}>
                  <SessionGameSwitcher />
                </Suspense>
              }
              actions={
                <>
                  <Suspense fallback={<NotificationCenter />}>
                    <SessionNotifications />
                  </Suspense>
                  <Suspense fallback={<Skeleton className="ml-1 size-7 rounded-full" />}>
                    <SessionUserMenu />
                  </Suspense>
                </>
              }
            />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              <Suspense fallback={<PageSkeleton />}>
                <AccessGate>{children}</AccessGate>
              </Suspense>
            </main>
          </div>
        </div>
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}
