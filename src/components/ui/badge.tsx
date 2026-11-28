import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  neutral: "border-line-strong bg-surface-2 text-fg-2",
  accent: "border-accent/25 bg-accent-soft text-accent-ink",
  good: "border-good/25 bg-good/10 text-good",
  warning: "border-warning/25 bg-warning/10 text-warning",
  serious: "border-serious/25 bg-serious/10 text-serious",
  critical: "border-critical/25 bg-critical/10 text-critical",
  info: "border-info/25 bg-info/10 text-info",
} as const;

export type BadgeTone = keyof typeof tones;

type BadgeProps = ComponentProps<"span"> & {
  tone?: BadgeTone;
  /** Leading icon (lucide). Status badges should always carry one. */
  icon?: ReactNode;
  /** Small colored dot instead of an icon. */
  dot?: boolean;
};

export function Badge({ tone = "neutral", icon, dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 text-[11px] font-medium leading-none",
        "[&_svg]:size-3 [&_svg]:shrink-0",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {icon}
      {children}
    </span>
  );
}

const dotTones: Record<BadgeTone, string> = {
  neutral: "bg-fg-3",
  accent: "bg-accent",
  good: "bg-good",
  warning: "bg-warning",
  serious: "bg-serious",
  critical: "bg-critical",
  info: "bg-info",
};

/** Small live-state indicator. `pulse` for ongoing activity (e.g. an agent working). */
export function StatusDot({
  tone = "neutral",
  pulse = false,
  className,
  label,
}: {
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
  /** Accessible name — a dot alone never carries meaning for screen readers. */
  label?: string;
}) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {pulse ? (
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-50", dotTones[tone])} />
      ) : null}
      <span className={cn("relative inline-flex size-2 rounded-full", dotTones[tone])} />
    </span>
  );
}
