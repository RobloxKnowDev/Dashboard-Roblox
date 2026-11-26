import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldControlStyles =
  "w-full rounded-md border border-line-strong bg-surface-2 text-[13px] text-fg placeholder:text-fg-3 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "hover:border-fg-4 focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-critical/60 aria-[invalid=true]:focus-visible:ring-critical/20";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(fieldControlStyles, "h-8 px-3", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldControlStyles, "min-h-20 resize-y px-3 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

/** Text input with a leading search icon. */
export function SearchInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-3"
        aria-hidden
      />
      <Input type="search" className="pl-8" {...props} />
    </div>
  );
}
