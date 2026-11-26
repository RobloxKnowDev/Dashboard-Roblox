import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-xs font-medium text-fg-2", className)} {...props} />;
}

type FieldProps = {
  /** id of the control inside — links label, hint and error for screen readers. */
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint/error, with consistent spacing.
 * Give the inner control `id={htmlFor}`, `aria-describedby={describedBy(htmlFor)}`
 * and `aria-invalid={!!error}`.
 */
export function Field({ htmlFor, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-0.5 text-fg-3" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby value matching the ids rendered by <Field>. */
export function describedBy(id: string): string {
  return `${id}-error ${id}-hint`;
}
