"use client";

import { Construction } from "lucide-react";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export type Availability = "Phase 2" | "Phase 3" | "Coming soon";

/**
 * A button whose feature isn't built yet: visibly disabled, focusable, and
 * explains when it will be available. Never ship a decorative button.
 */
export function ComingSoonButton({
  availability = "Coming soon",
  children,
  ...props
}: Omit<ButtonProps, "disabled" | "onClick"> & { availability?: Availability }) {
  const label = availability === "Coming soon" ? "Coming soon" : `Available in ${availability}`;
  return (
    <Tooltip content={label}>
      {/* Disabled buttons don't receive pointer/focus events, so the wrapper carries the tooltip. */}
      <span tabIndex={0} className="inline-flex rounded-md" aria-label={`${typeof children === "string" ? children : ""} — ${label}`.trim()}>
        <Button {...props} aria-disabled disabled tabIndex={-1}>
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}

/** Placeholder block for a section that will be built in a later phase. */
export function ComingSoonPanel({
  title,
  description,
  availability = "Phase 2",
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  availability?: Availability;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong",
        "bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgb(255_255_255/0.012)_10px,rgb(255_255_255/0.012)_20px)]",
        "px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-3">
        <Construction className="size-4" aria-hidden />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-fg-3">{description}</p> : null}
      </div>
      <span className="rounded-xs border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-3">
        {availability}
      </span>
      {children}
    </div>
  );
}
