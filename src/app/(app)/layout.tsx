import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { NotificationCenter } from "@/components/layout/notification-center";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { UserMenu } from "@/components/layout/user-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Private application shell: sidebar + topbar around every page.
 * The shell is static (prerendered); session-dependent widgets will stream
 * in behind Suspense once authentication is wired (Jalon B).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <TooltipProvider delayDuration={250}>
      <CommandPaletteProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-accent-fg"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              actions={
                <>
                  <NotificationCenter />
                  <UserMenu user={null} />
                </>
              }
            />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
          </div>
        </div>
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}
