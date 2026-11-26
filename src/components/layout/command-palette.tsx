"use client";

import { Command } from "cmdk";
import { CornerDownLeft, Palette, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Kbd } from "@/components/ui/primitives";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

type PaletteContextValue = { open: boolean; setOpen: (open: boolean) => void };
const PaletteContext = createContext<PaletteContextValue | null>(null);

function usePalette(): PaletteContextValue {
  const ctx = use(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used inside <CommandPaletteProvider>");
  return ctx;
}

const noopSubscribe = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere (server renders "Ctrl"). */
function useModifierKey(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/** Holds the palette's open state and the global Ctrl/⌘+K shortcut. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </PaletteContext>
  );
}

/** Search field look-alike in the topbar that opens the palette. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { setOpen } = usePalette();
  const mod = useModifierKey();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg-3 transition-colors",
        "hover:border-line-strong hover:text-fg-2",
        className,
      )}
      aria-label="Search (opens command palette)"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <span className="hidden items-center gap-0.5 sm:flex" aria-hidden>
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

const itemClass =
  "flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] text-fg-2 " +
  "data-[selected=true]:bg-surface-3 data-[selected=true]:text-fg [&_svg]:size-4 [&_svg]:text-fg-3 data-[selected=true]:[&_svg]:text-accent";

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global search"
      overlayClassName="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in"
      contentClassName={cn(
        "fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden",
        "rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60 data-[state=open]:animate-pop-in",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-fg-3" aria-hidden />
        <Command.Input
          placeholder="Search pages and actions…"
          className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-3 focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="py-10 text-center text-xs text-fg-3">No results.</Command.Empty>
        {navigation.map((section) => (
          <Command.Group
            key={section.title}
            heading={section.title}
            className="mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-fg-3"
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.href}
                  value={`${item.title} ${section.title}`}
                  keywords={item.keywords}
                  onSelect={() => go(item.href)}
                  className={itemClass}
                >
                  <Icon aria-hidden />
                  {item.title}
                  <span className="ml-auto text-[11px] text-fg-3">{section.title}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
        <Command.Group
          heading="Internal"
          className="mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-fg-3"
        >
          <Command.Item
            value="Design System Internal"
            keywords={["components", "ui", "tokens", "colors"]}
            onSelect={() => go("/design-system")}
            className={itemClass}
          >
            <Palette aria-hidden />
            Design System
            <span className="ml-auto text-[11px] text-fg-3">Internal</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-fg-3">
        <span>Projects, tasks and games become searchable once live data is connected.</span>
        <span className="flex items-center gap-1">
          <CornerDownLeft className="size-3" aria-hidden /> open
        </span>
      </div>
    </Command.Dialog>
  );
}
