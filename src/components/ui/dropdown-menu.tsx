"use client";

import { DropdownMenu as Menu } from "radix-ui";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-lg border border-line-strong bg-surface-3 p-1 shadow-xl shadow-black/40",
          "data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

const itemStyles =
  "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] text-fg-2 outline-none " +
  "data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-45 " +
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-3";

export function DropdownMenuItem({
  className,
  destructive,
  shortcut,
  children,
  ...props
}: ComponentProps<typeof Menu.Item> & { destructive?: boolean; shortcut?: ReactNode }) {
  return (
    <Menu.Item
      className={cn(itemStyles, destructive && "text-critical data-[highlighted]:text-critical [&_svg]:text-critical", className)}
      {...props}
    >
      {children}
      {shortcut ? <span className="ml-auto pl-4 font-mono text-[11px] text-fg-3">{shortcut}</span> : null}
    </Menu.Item>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={cn(itemStyles, "pl-8", className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2 inline-flex">
        <Check className="text-accent!" />
      </Menu.ItemIndicator>
      {children}
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-2 pb-1 pt-1.5 text-[11px] font-medium text-fg-3", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />;
}
