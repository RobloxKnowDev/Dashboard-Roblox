import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { SourceBadge } from "@/components/feedback/demo-badge";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { formatDelta } from "@/lib/utils/format";

type StatCardProps = {
  /** Sentence case, no trailing colon: "Total revenue". */
  label: string;
  /** Already formatted (auto-compact): "$4.2M", "12.9K". */
  value: string;
  source: DataSource;
  icon?: LucideIcon;
  /** Relative change vs the comparison period, e.g. 0.124 for +12.4%. */
  delta?: number;
  /** Comparison period, e.g. "vs previous 30 days". */
  deltaLabel?: string;
  /** Whether an increase is good news (false for costs, errors, churn…). */
  upIsGood?: boolean;
  /** Recent values for the trend sparkline (≈12 points). */
  trend?: number[];
  /** Secondary line under the value. */
  hint?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  source,
  icon: Icon,
  delta,
  deltaLabel,
  upIsGood = true,
  trend,
  hint,
  className,
}: StatCardProps) {
  const direction = delta === undefined || Math.abs(delta) < 0.0005 ? "flat" : delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const DeltaIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <section
      aria-label={label}
      className={cn(
        "group relative flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-lg border border-line bg-surface p-4",
        "transition-colors hover:border-line-strong",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-fg-2">
          {Icon ? <Icon className="size-3.5 shrink-0 text-fg-3" aria-hidden /> : null}
          <span className="truncate">{label}</span>
        </div>
        <SourceBadge source={source} />
      </header>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-2xl font-semibold tracking-tight text-fg">{value}</p>
          {trend && trend.length > 1 ? (
            <div className="mb-1 w-20 shrink-0">
              <Sparkline values={trend} height={28} />
            </div>
          ) : null}
        </div>
        {delta !== undefined ? (
          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 font-medium",
                good === null ? "text-fg-3" : good ? "text-good" : "text-critical",
              )}
            >
              <DeltaIcon className="size-3.5" aria-hidden />
              {formatDelta(delta)}
            </span>
            {deltaLabel ? <span className="truncate text-fg-3">{deltaLabel}</span> : null}
          </p>
        ) : hint ? (
          <p className="mt-1 truncate text-xs text-fg-3">{hint}</p>
        ) : null}
      </div>
    </section>
  );
}
