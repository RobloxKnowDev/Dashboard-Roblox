"use client";

import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Select({
  id,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  name,
  className,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectPrimitive.Trigger
        id={id}
        {...aria}
        className={cn(
          "inline-flex h-8 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface-2 px-3 text-[13px] text-fg",
          "transition-colors hover:border-fg-4 focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
          "data-[placeholder]:text-fg-3 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-critical/60",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-3.5 text-fg-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-strong bg-surface-3 shadow-xl shadow-black/40 data-[state=open]:animate-pop-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex h-8 cursor-default select-none items-center rounded-md pl-7 pr-2 text-[13px] text-fg-2 outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
                  <Check className="size-3.5 text-accent-ink" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
