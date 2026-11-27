import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-surface", "shadow-[0_1px_0_rgb(255_255_255/0.02)_inset]", className)}
      {...props}
    />
  );
}

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot: actions, filters, badges. */
  actions?: ReactNode;
  className?: string;
  /** Heading level for the document outline. */
  as?: "h2" | "h3";
};

export function CardHeader({ title, description, actions, className, as: Heading = "h2" }: CardHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-4", className)}>
      <div className="min-w-0">
        {/* Phones: long titles wrap instead of being cut next to the actions. */}
        <Heading className="text-[13px] font-semibold text-fg sm:truncate">{title}</Heading>
        {description ? <p className="mt-0.5 text-xs text-fg-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      className={cn("flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-fg-3", className)}
      {...props}
    />
  );
}
