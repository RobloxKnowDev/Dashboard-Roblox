import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { InfoTip } from "@/components/ui/info-tip";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { FormattedDelta } from "./formatted-delta";

/** Colored square behind a figure's icon: identity only, never a status. */
export const ICON_TILE = {
  blue: "bg-accent/15 text-accent-ink",
  green: "bg-chart-6/15 text-good",
  aqua: "bg-chart-3/15 text-chart-3",
  amber: "bg-chart-4/15 text-warning",
  violet: "bg-chart-7/15 text-chart-7",
  red: "bg-chart-8/15 text-critical",
  neutral: "bg-surface-3 text-fg-2",
} as const;
export type IconTone = keyof typeof ICON_TILE;

export function IconTile({ icon: Icon, tone = "blue", className }: { icon: LucideIcon; tone?: IconTone; className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", ICON_TILE[tone], className)} aria-hidden>
      <Icon className="size-[18px]" />
    </span>
  );
}

/** "↑ 12.4% vs previous 30 days": green when the change is good news, red when bad. */
export function DeltaLine({ delta, label, upIsGood = true }: { delta: number; label?: string; upIsGood?: boolean }) {
  const direction = Math.abs(delta) < 0.0005 ? "flat" : delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const DeltaIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs">
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-xs px-1 py-px font-medium",
          good === null ? "bg-surface-2 text-fg-3" : good ? "bg-good/10 text-good" : "bg-critical/10 text-critical",
        )}
      >
        <DeltaIcon className="size-3.5" aria-hidden />
        <FormattedDelta value={delta} />
      </span>
      {label ? <span className="truncate text-fg-3">{label}</span> : null}
    </p>
  );
}

type StatCardProps = {
  /** Sentence case, no trailing colon: "Total revenue". */
  label: string;
  /** Already formatted (auto-compact): "$4.2M", "12.9K". */
  value: string;
  source: DataSource;
  icon?: LucideIcon;
  /** Color of the icon tile. */
  tone?: IconTone;
  /** Plain-language explanation behind the (i): what the figure is, where it comes from. */
  info?: string;
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

/** One key figure: big value, its name underneath, (i) explanation, optional change and trend. */
export function StatCard({
  label,
  value,
  source,
  icon,
  tone = "blue",
  info,
  delta,
  deltaLabel,
  upIsGood = true,
  trend,
  hint,
  className,
}: StatCardProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "@container relative flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-lg border border-line bg-surface p-4",
        "transition-colors hover:border-line-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[22px] font-semibold leading-tight tracking-tight text-fg tabular">{value}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1">
            <h3 className="truncate text-xs font-medium text-fg-3">{label}</h3>
            {info ? <InfoTip label={label}>{info}</InfoTip> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {icon ? <IconTile icon={icon} tone={tone} /> : null}
          <SourceBadge source={source} />
        </div>
      </div>

      {delta !== undefined || hint || (trend && trend.length > 1) ? (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {delta !== undefined ? (
              <DeltaLine delta={delta} label={deltaLabel} upIsGood={upIsGood} />
            ) : null}
            {hint ? <p className={cn("truncate text-[11px] text-fg-3", delta !== undefined && "mt-1")}>{hint}</p> : null}
          </div>
          {trend && trend.length > 1 ? (
            // Only when the card is wide enough to keep the value readable (two cards per row on phones).
            <div className="hidden w-20 shrink-0 @[15rem]:block">
              <Sparkline values={trend} height={28} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
