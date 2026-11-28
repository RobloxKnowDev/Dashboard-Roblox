"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const widths = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

type ModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the modal (uncontrolled usage). */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof widths;
  /** Footer slot, typically Cancel + primary action. */
  footer?: ReactNode;
  children?: ReactNode;
};

/** Accessible dialog: focus trap, Esc to close, labelled by its title. */
export function Modal({ open, onOpenChange, trigger, title, description, size = "md", footer, children }: ModalProps) {
  const t = useT();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            // Phones: near the top and sized to the visible height (dvh shrinks with the keyboard).
            "fixed left-1/2 top-4 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 flex-col sm:top-[12vh] sm:max-h-[76vh]",
            "rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/50",
            "data-[state=open]:animate-pop-in focus:outline-none",
            widths[size],
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-fg">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-xs text-fg-3">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-1.5 -mt-1 rounded-md p-1.5 text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg"
              aria-label={t.common.actions.close}
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div> : null}
          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalClose = Dialog.Close;
