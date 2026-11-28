/**
 * Chart color roles. Mirrors the --color-chart-* tokens in globals.css
 * (SVG presentation attributes need literal colors, not CSS variables).
 *
 * The categorical order was validated with the dataviz validator against the
 * card surface (#151517): lightness band, chroma, CVD separation ≥ 8.4,
 * normal-vision ΔE ≥ 19.3, contrast ≥ 3:1. Slot 1 is the brand blue. Assign in order, never cycle,
 * and keep a series' color stable when filters change.
 */
export const SERIES_COLORS = [
  "#3369ff", // 1 blue (brand accent)
  "#d95926", // 2 orange
  "#199e70", // 3 aqua
  "#c98500", // 4 yellow
  "#d55181", // 5 magenta
  "#0ca30c", // 6 green
  "#9085e9", // 7 violet
  "#e66767", // 8 red
] as const;

export const CHART_INK = {
  grid: "#26262b",
  axis: "#34343a",
  tick: "#8a8a93",
  surface: "#151517",
  crosshair: "#5b5b63",
  muted: "#5b5b63",
  accent: "#3369ff",
} as const;

export type SeriesConfig = {
  /** Key in each data row. */
  key: string;
  label: string;
  /** Defaults to the categorical slot matching the series' position. */
  color?: string;
};

export function seriesColor(series: SeriesConfig, index: number): string {
  return series.color ?? SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
}
