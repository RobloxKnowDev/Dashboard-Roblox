import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden {...props} />;
}

/** Keyboard key hint: <Kbd>⌘K</Kbd> */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-surface-2 px-1 font-mono text-[10px] font-medium text-fg-3",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cn("shrink-0 bg-line", vertical ? "h-full w-px" : "h-px w-full", className)}
    />
  );
}

const progressTones = {
  accent: "bg-accent",
  good: "bg-good",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
} as const;

/** Thin horizontal meter. `value` is 0–100. */
export function Progress({
  value,
  tone = "accent",
  className,
  label,
}: {
  value: number;
  tone?: keyof typeof progressTones;
  className?: string;
  /** Accessible name, e.g. "Project progress". */
  label: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", progressTones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
