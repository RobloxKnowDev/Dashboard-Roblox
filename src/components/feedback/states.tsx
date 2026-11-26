import { CircleExclamationPoint, Inbox, LoaderCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/primitives";

type StateProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Call-to-action slot (a Button). */
  action?: ReactNode;
  className?: string;
  /** Smaller variant for use inside cards. */
  compact?: boolean;
};

/** Nothing here yet — explains why and what to do next. */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className, compact }: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-3",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} aria-hidden />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-fg-3">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Something failed — always say what, and offer a way out. */
export function ErrorState({
  title = "Something went wrong",
  description = "The data couldn't be loaded. Try again in a moment.",
  action,
  className,
  compact,
}: Partial<StateProps>) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-16",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg border border-critical/25 bg-critical/10 text-critical">
        <CircleExclamationPoint className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-3">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Inline spinner + label, for actions in progress. */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-10 text-xs text-fg-3", className)}>
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/** Skeleton shaped like a card with a chart — used as Suspense fallback. */
export function ChartSkeleton({ className, height = 240 }: { className?: string; height?: number }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-5", className)} role="status" aria-label="Loading chart">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="mt-2 h-3 w-48" />
      <Skeleton className="mt-5 w-full" style={{ height }} />
    </div>
  );
}

/** Skeleton for a list or table — used as Suspense fallback. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 p-5", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
