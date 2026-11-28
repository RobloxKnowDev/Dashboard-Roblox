import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SERIES_COLORS } from "@/components/charts/theme";
import type { Messages } from "@/i18n/messages";

/*
 * ColorFoundations and TypeFoundations render on the server (design-system
 * page) and get the dictionary as a prop: this file is also imported by the
 * client playground (DsSection, DsGroup), so it can't read the server locale.
 */

/** Notes are t.designSystem.colors.notes[token]. */
type Swatch = { token: string; hex: string };

const SURFACES: Swatch[] = [
  { token: "canvas", hex: "#0c0c0e" },
  { token: "surface", hex: "#151517" },
  { token: "surface-2", hex: "#1c1c1f" },
  { token: "surface-3", hex: "#232327" },
  { token: "line", hex: "#26262b" },
  { token: "line-strong", hex: "#34343a" },
];

const INK: Swatch[] = [
  { token: "fg", hex: "#f4f4f5" },
  { token: "fg-2", hex: "#a8a8b0" },
  { token: "fg-3", hex: "#8a8a93" },
  { token: "fg-4", hex: "#5b5b63" },
];

const BRAND_STATUS: Swatch[] = [
  { token: "accent", hex: "#b01dfb" },
  { token: "accent-ink", hex: "#c788ff" },
  { token: "good", hex: "#3fcb6e" },
  { token: "warning", hex: "#f5b53d" },
  { token: "serious", hex: "#ef8a5f" },
  { token: "critical", hex: "#f06a6a" },
  { token: "info", hex: "#5ba2f0" },
];

function SwatchGrid({ swatches, notes }: { swatches: Swatch[]; notes: Record<string, string> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {swatches.map((s) => (
        <li key={s.token} className="overflow-hidden rounded-md border border-line">
          <div className="h-14 border-b border-line" style={{ backgroundColor: s.hex }} />
          <div className="space-y-0.5 bg-surface-2/40 px-2.5 py-2">
            <p className="font-mono text-[11px] text-fg">{s.token}</p>
            <p className="font-mono text-[10px] uppercase text-fg-3">{s.hex}</p>
            {notes[s.token] ? <p className="text-[11px] text-fg-3">{notes[s.token]}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DsSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader title={title} description={description} />
      <CardBody className="space-y-6">{children}</CardBody>
    </Card>
  );
}

export function DsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-3">{label}</p>
      {children}
    </div>
  );
}

export function ColorFoundations({ t }: { t: Messages }) {
  const c = t.designSystem.colors;
  return (
    <DsSection id="colors" title={c.title} description={c.description}>
      <DsGroup label={c.surfaces}>
        <SwatchGrid swatches={SURFACES} notes={c.notes} />
      </DsGroup>
      <DsGroup label={c.ink}>
        <SwatchGrid swatches={INK} notes={c.notes} />
      </DsGroup>
      <DsGroup label={c.accentStatus}>
        <SwatchGrid swatches={BRAND_STATUS} notes={c.notes} />
      </DsGroup>
      <DsGroup label={c.chartSeries}>
        <ul className="flex flex-wrap gap-2">
          {SERIES_COLORS.map((hex, i) => (
            <li key={hex} className="flex items-center gap-2 rounded-md border border-line bg-surface-2/40 py-1.5 pl-1.5 pr-2.5">
              <span className="size-5 rounded-[4px]" style={{ backgroundColor: hex }} aria-hidden />
              <span className="font-mono text-[11px] text-fg-2">
                {i + 1} · {hex}
              </span>
            </li>
          ))}
        </ul>
      </DsGroup>
    </DsSection>
  );
}

export function TypeFoundations({ t }: { t: Messages }) {
  const ty = t.designSystem.typography;
  return (
    <DsSection id="typography" title={ty.title} description={ty.description}>
      <div className="space-y-5">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-fg">{ty.display}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">font-display · 30px · semibold</p>
        </div>
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-fg">{ty.pageTitle}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">font-display · 24px · semibold</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-fg">{ty.cardTitle}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">13px · semibold</p>
        </div>
        <div>
          <p className="max-w-xl text-[13px] leading-relaxed text-fg-2">{ty.body}</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">13px · regular · leading-relaxed</p>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-fg">$48.2K</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">{ty.statValue}</p>
          </div>
          <div>
            <p className="tabular font-mono text-[13px] text-fg">1,284,092</p>
            <p className="tabular font-mono text-[13px] text-fg">0,094,317</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">{ty.columns}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-3">{ty.sectionLabel}</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">{ty.sectionLabelSpec}</p>
          </div>
        </div>
      </div>
    </DsSection>
  );
}
