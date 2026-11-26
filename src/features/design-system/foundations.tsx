import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SERIES_COLORS } from "@/components/charts/theme";

type Swatch = { token: string; hex: string; note?: string };

const SURFACES: Swatch[] = [
  { token: "canvas", hex: "#08090b", note: "Page background" },
  { token: "surface", hex: "#0f1114", note: "Cards" },
  { token: "surface-2", hex: "#15181c", note: "Inputs, hover" },
  { token: "surface-3", hex: "#1b1f24", note: "Menus, popovers" },
  { token: "line", hex: "#1f232a", note: "Hairline borders" },
  { token: "line-strong", hex: "#2b3039", note: "Control borders" },
];

const INK: Swatch[] = [
  { token: "fg", hex: "#edeef0", note: "Primary · 16.3:1" },
  { token: "fg-2", hex: "#a3a8b2", note: "Secondary · 7.9:1" },
  { token: "fg-3", hex: "#7d838e", note: "Muted · 5.0:1" },
  { token: "fg-4", hex: "#5a606a", note: "Decorative only" },
];

const BRAND_STATUS: Swatch[] = [
  { token: "accent", hex: "#c6f24e", note: "Signature · actions, focus" },
  { token: "good", hex: "#3fcb6e", note: "Success" },
  { token: "warning", hex: "#f5b53d", note: "Warning" },
  { token: "serious", hex: "#ef8a5f", note: "Serious" },
  { token: "critical", hex: "#f06a6a", note: "Critical" },
  { token: "info", hex: "#5ba2f0", note: "Information" },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {swatches.map((s) => (
        <li key={s.token} className="overflow-hidden rounded-md border border-line">
          <div className="h-14 border-b border-line" style={{ backgroundColor: s.hex }} />
          <div className="space-y-0.5 bg-surface-2/40 px-2.5 py-2">
            <p className="font-mono text-[11px] text-fg">{s.token}</p>
            <p className="font-mono text-[10px] uppercase text-fg-3">{s.hex}</p>
            {s.note ? <p className="text-[11px] text-fg-3">{s.note}</p> : null}
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

export function ColorFoundations() {
  return (
    <DsSection id="colors" title="Colors" description="Tokens live in src/app/globals.css (@theme). Contrast measured against every surface.">
      <DsGroup label="Surfaces & lines">
        <SwatchGrid swatches={SURFACES} />
      </DsGroup>
      <DsGroup label="Ink">
        <SwatchGrid swatches={INK} />
      </DsGroup>
      <DsGroup label="Accent & status">
        <SwatchGrid swatches={BRAND_STATUS} />
      </DsGroup>
      <DsGroup label="Chart series — fixed order, CVD-validated on the card surface">
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

export function TypeFoundations() {
  return (
    <DsSection id="typography" title="Typography" description="Mona Sans (with its expanded width axis for display) and JetBrains Mono for data.">
      <div className="space-y-5">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-fg">Display — Studio control center</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">font-display · 30px · semibold · wdth 112</p>
        </div>
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-fg">Page title</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">font-display · 24px · semibold</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-fg">Card title</p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">13px · semibold</p>
        </div>
        <div>
          <p className="max-w-xl text-[13px] leading-relaxed text-fg-2">
            Body copy is set at 13–14px with relaxed leading. Secondary text uses the fg-2 ink; hints and metadata use
            fg-3. Never use fg-4 for text people need to read.
          </p>
          <p className="mt-1 font-mono text-[11px] text-fg-3">13px · regular · leading-relaxed</p>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-fg">$48.2K</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">Stat value · proportional figures</p>
          </div>
          <div>
            <p className="tabular font-mono text-[13px] text-fg">1,284,092</p>
            <p className="tabular font-mono text-[13px] text-fg">0,094,317</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">Columns · tabular figures</p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-3">Section label</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">Mono · 10px · uppercase · tracked</p>
          </div>
        </div>
      </div>
    </DsSection>
  );
}
