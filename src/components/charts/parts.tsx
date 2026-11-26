"use client";

import type { TooltipContentProps } from "recharts";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { seriesColor, type SeriesConfig } from "./theme";

export type ValueFormatter = (value: number) => string;

/**
 * Shared tooltip: one readout for every series at the hovered X.
 * Values lead (strong), series names follow (secondary), keyed by a short line.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}: Pick<TooltipContentProps, "active" | "payload" | "label"> & {
  formatValue: ValueFormatter;
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = label === undefined ? "" : formatLabel ? formatLabel(String(label)) : String(label);
  return (
    <div className="min-w-36 rounded-md border border-line-strong bg-surface-3 px-3 py-2 shadow-xl shadow-black/40">
      {heading ? <p className="mb-1.5 text-[11px] text-fg-3">{heading}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-xs">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color ?? entry.stroke }} aria-hidden />
            <span className="tabular font-semibold text-fg">
              {typeof entry.value === "number" ? formatValue(entry.value) : String(entry.value ?? "—")}
            </span>
            <span className="text-fg-3">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Same-size stand-in rendered on the server and during hydration, so the
 * chart mounts in the browser without any layout shift.
 */
export function ChartPlaceholder({ height, withLegend }: { height: number; withLegend: boolean }) {
  return (
    <div aria-hidden>
      {withLegend ? <div className="mb-3 h-4" /> : null}
      <div className="skeleton rounded-md opacity-40" style={{ height }} />
    </div>
  );
}

/** Legend for ≥2 series: swatch mirrors the mark (line for lines, square for bars/areas). */
export function ChartLegend({ series, mark }: { series: SeriesConfig[]; mark: "line" | "square" }) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5 text-xs text-fg-2">
          <span
            className={mark === "line" ? "h-0.5 w-3 rounded-full" : "size-2.5 rounded-[3px]"}
            style={{ backgroundColor: seriesColor(s, i) }}
            aria-hidden
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Table view of a chart's data — the accessible alternative to the plot. */
export function ChartDataTable<Row extends Record<string, string | number>>({
  data,
  categoryKey,
  categoryLabel,
  series,
  formatValue,
  formatCategory,
}: {
  data: Row[];
  categoryKey: keyof Row & string;
  categoryLabel: string;
  series: SeriesConfig[];
  formatValue: ValueFormatter;
  formatCategory?: (value: string) => string;
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-line">
      <Table>
        <THead className="sticky top-0 bg-surface">
          <tr>
            <TH>{categoryLabel}</TH>
            {series.map((s) => (
              <TH key={s.key} className="text-right">
                {s.label}
              </TH>
            ))}
          </tr>
        </THead>
        <TBody>
          {data.map((row) => {
            const category = String(row[categoryKey]);
            return (
              <TR key={category}>
                <TD className="text-fg">{formatCategory ? formatCategory(category) : category}</TD>
                {series.map((s) => {
                  const value = row[s.key];
                  return (
                    <TD key={s.key} className="tabular text-right">
                      {typeof value === "number" ? formatValue(value) : (value ?? "—")}
                    </TD>
                  );
                })}
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
