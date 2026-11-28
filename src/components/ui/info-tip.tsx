"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type InfoTipProps = {
  /** Plain-language explanation: what the figure is, where it comes from. */
  children: ReactNode;
  /** What the explanation is about, for screen readers ("Total revenue"). */
  label: string;
  className?: string;
};

/**
 * The (i) next to a title or a figure. Opens on click or tap (not hover) so
 * the explanation also works on phones and with the keyboard.
 */
export function InfoTip({ children, label, className }: InfoTipProps) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t.common.actions.explain(label)}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg data-[state=open]:text-accent-ink",
          className,
        )}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="max-w-72 px-3 py-2.5 text-xs leading-relaxed text-fg-2">
        {children}
      </PopoverContent>
    </Popover>
  );
}
