"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  /** Delay before showing, in ms. */
  delay?: number;
};

/** Short contextual hint. The trigger must be focusable (button, link, or tabIndex=0). */
export function Tooltip({ content, children, side = "top", align = "center", className, delay = 250 }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-[60] max-w-64 rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-xs text-fg shadow-lg shadow-black/40",
            "data-[state=delayed-open]:animate-fade-in",
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
