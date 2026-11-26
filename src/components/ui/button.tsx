import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,border-color,color,box-shadow,opacity] duration-150 ease-out " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
  secondary:
    "border border-line-strong bg-surface-2 text-fg hover:bg-surface-3 hover:border-fg-4",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
  outline: "border border-line-strong text-fg-2 hover:border-fg-4 hover:text-fg",
  danger:
    "border border-critical/30 bg-critical/10 text-critical hover:bg-critical/20 hover:border-critical/50",
} as const;

const sizes = {
  sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
  md: "h-8 px-3 text-[13px]",
  lg: "h-10 px-4 text-sm",
  icon: "size-8",
  "icon-sm": "size-7 [&_svg]:size-3.5",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element (e.g. a Next.js <Link>) with button styles. */
  asChild?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  className,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={buttonStyles({ variant, size, className })}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
