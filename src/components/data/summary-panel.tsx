import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils/cn";
import { DeltaLine, IconTile, type IconTone } from "./stat-card";

export type SummaryFigure = { label: string; value: string; info: string; hint?: string; icon: LucideIcon; tone: IconTone };

type SummaryPanelProps = {
  title: string;
  description?: string;
  info?: string;
  /** The headline figure, in the signature blue. */
  hero: {
    label: string;
    value: string;
    info: string;
    icon: LucideIcon;
    delta?: number;
    deltaLabel?: string;
    hint?: ReactNode;
  };
  /** Four secondary figures (2 × 2). */
  figures: SummaryFigure[];
};

/** Borders of the 2×2 grid (two columns even on phones: the icons hide there). */
const CELL_BORDERS = ["", "border-l border-line", "border-t border-line", "border-t border-l border-line"];

function Figure({ figure, className }: { figure: SummaryFigure; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-3 p-4 sm:p-5", className)}>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold tracking-tight text-fg tabular sm:text-xl">{figure.value}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1">
          <h3 className="truncate text-xs font-medium text-fg-3">{figure.label}</h3>
          <InfoTip label={figure.label}>{figure.info}</InfoTip>
        </div>
        {figure.hint ? <p className="mt-1 truncate text-[11px] text-fg-3">{figure.hint}</p> : null}
      </div>
      <IconTile icon={figure.icon} tone={figure.tone} className="hidden sm:flex" />
    </div>
  );
}

/**
 * "Earnings summary" block: one big blue figure on the left, four figures
 * with their colored icons on the right, each with its (i) explanation.
 */
export function SummaryPanel({ title, description, info, hero, figures }: SummaryPanelProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} info={info} />
      <div className="mt-3 grid grid-cols-1 border-t border-line lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="flex min-w-0 flex-col justify-center gap-4 border-b border-line p-5 lg:border-b-0 lg:border-r">
          <IconTile icon={hero.icon} tone="accent" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="text-xs font-medium text-accent-ink">{hero.label}</h3>
              <InfoTip label={hero.label}>{hero.info}</InfoTip>
            </div>
            <p className="mt-1 truncate text-[34px] font-semibold leading-tight tracking-tight text-accent tabular">{hero.value}</p>
            <div className="mt-2 space-y-1">
              {hero.delta !== undefined ? <DeltaLine delta={hero.delta} label={hero.deltaLabel} /> : null}
              {hero.hint ? <p className="truncate text-[11px] text-fg-3">{hero.hint}</p> : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2">
          {figures.map((figure, index) => (
            <Figure key={figure.label} figure={figure} className={CELL_BORDERS[index]} />
          ))}
        </div>
      </div>
    </Card>
  );
}
