"use client";

import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";

/** Slide-in navigation drawer for screens narrower than the desktop sidebar. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="-ml-1.5 rounded-md p-1.5 text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-line bg-canvas shadow-2xl data-[state=open]:animate-fade-in focus:outline-none lg:hidden">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <Dialog.Close className="rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close navigation">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-2">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
