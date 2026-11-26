import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";

/**
 * Marks any widget fed by demonstration data. Rendered automatically by
 * components that receive a DataResult with source "demo".
 */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-xs border border-dashed border-warning/40 bg-warning/5 px-1.5",
        "font-mono text-[10px] font-semibold uppercase tracking-wider text-warning",
        className,
      )}
      title="Demonstration data — not connected to a real source yet"
    >
      <FlaskConical className="size-3" aria-hidden />
      Demo
    </span>
  );
}

/** Renders the demo badge only when the data is demo data. */
export function SourceBadge({ source, className }: { source: DataSource; className?: string }) {
  return source === "demo" ? <DemoBadge className={className} /> : null;
}

/** Page-level notice when most of a page is fed by demo data. */
export function DemoBanner({ children }: { children?: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-dashed border-warning/30 bg-warning/[0.04] px-4 py-3 text-xs text-fg-2"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-medium text-warning">Demonstration data. </span>
        {children ??
          "This section isn't connected to a real source yet. Every figure marked DEMO is illustrative and is never stored or mixed with your real data."}
      </p>
    </div>
  );
}
