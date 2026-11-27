"use client";

import { ChartLine, Table2 } from "lucide-react";
import { createContext, use, useState, type ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SourceBadge } from "@/components/feedback/demo-badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { DataSource } from "@/lib/data/source";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

type ChartView = "chart" | "table";
const ChartViewContext = createContext<ChartView>("chart");

/** Charts read this to render their accessible table view instead of the plot. */
export function useChartView(): ChartView {
  return use(ChartViewContext);
}

type ChartCardProps = {
  title: string;
  description?: string;
  source: DataSource;
  /** Extra header controls (rendered left of the chart/table toggle). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Card wrapper for every chart: title, source badge, and a chart ↔ table
 * toggle so every value is reachable without hovering.
 */
export function ChartCard({ title, description, source, actions, className, children }: ChartCardProps) {
  const [view, setView] = useState<ChartView>("chart");
  const t = useT();
  const nextView = view === "chart" ? "table" : "chart";
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title={title}
        description={description}
        actions={
          <>
            <SourceBadge source={source} />
            {actions}
            <Tooltip content={nextView === "table" ? t.common.actions.showAsTable : t.common.actions.showAsChart}>
              <button
                type="button"
                onClick={() => setView(nextView)}
                aria-label={nextView === "table" ? t.common.actions.showTitleAsTable(title) : t.common.actions.showTitleAsChart(title)}
                aria-pressed={view === "table"}
                className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {view === "chart" ? <Table2 className="size-3.5" /> : <ChartLine className="size-3.5" />}
              </button>
            </Tooltip>
          </>
        }
      />
      <CardBody className="flex-1 pt-3">
        <ChartViewContext value={view}>{children}</ChartViewContext>
      </CardBody>
    </Card>
  );
}
