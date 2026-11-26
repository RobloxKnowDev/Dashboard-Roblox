import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Primary page actions, right-aligned. */
  actions?: ReactNode;
  /** Small label above the title (e.g. the parent section). */
  eyebrow?: ReactNode;
  className?: string;
};

/** Consistent page title block — every page starts with one. */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-3">{eyebrow}</div>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-fg-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Standard page container: max width, padding, vertical rhythm. */
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-8 md:py-8", className)}>{children}</div>;
}
