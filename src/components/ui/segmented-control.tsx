"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils/cn";

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  "aria-label": string;
  className?: string;
};

/** Compact single-choice switcher — time ranges, view modes. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix emits "" when the active item is clicked again — keep a value selected.
        if (next) onValueChange(next as T);
      }}
      className={cn("inline-flex h-8 max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-0.5", className)}
      {...aria}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "inline-flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-xs font-medium text-fg-3 transition-colors",
            "hover:text-fg-2 data-[state=on]:bg-surface-3 data-[state=on]:text-fg data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
            "[&_svg]:size-3.5",
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
