import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  /** One sentence: what this page is for. */
  description?: ReactNode;
  /** Longer explanation behind the (i) next to the title. */
  info?: ReactNode;
  /** Primary page actions, right-aligned. */
  actions?: ReactNode;
  /** Small label above the title (e.g. the parent section). */
  eyebrow?: ReactNode;
  className?: string;
};

/** Consistent page title block — every page starts with one. */
export function PageHeader({ title, description, info, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs font-medium text-fg-3">{eyebrow}</div> : null}
        <div className="flex items-center gap-1.5">
          <h1 className="font-display text-[22px] font-semibold text-fg">{title}</h1>
          {info ? <InfoTip label={title}>{info}</InfoTip> : null}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-fg-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Standard page container: max width, padding, vertical rhythm. */
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-8 md:py-7", className)}>{children}</div>;
}
