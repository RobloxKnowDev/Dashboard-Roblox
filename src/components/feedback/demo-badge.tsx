"use client";

import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import type { DataSource } from "@/lib/data/source";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/client";

/**
 * Marks any widget fed by demonstration data. Rendered automatically by
 * components that receive a DataResult with source "demo".
 */
export function DemoBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-xs border border-dashed border-warning/40 bg-warning/5 px-1.5",
        "font-mono text-[10px] font-semibold uppercase tracking-wider text-warning",
        className,
      )}
      title={t.common.demo.badgeTitle}
    >
      <FlaskConical className="size-3" aria-hidden />
      {t.common.demo.badge}
    </span>
  );
}

/** Renders the demo badge only when the data is demo data. */
export function SourceBadge({ source, className }: { source: DataSource; className?: string }) {
  return source === "demo" ? <DemoBadge className={className} /> : null;
}

/** Page-level notice when most of a page is fed by demo data. */
export function DemoBanner({ children }: { children?: ReactNode }) {
  const t = useT();
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-dashed border-warning/30 bg-warning/[0.04] px-4 py-3 text-xs text-fg-2"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-medium text-warning">{t.common.demo.bannerLead} </span>
        {children ?? t.common.demo.bannerBody}
      </p>
    </div>
  );
}
