"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const Tabs = TabsPrimitive.Root;

/** Underlined tab row — for switching views inside a page. */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex items-center gap-5 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative -mb-px inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent text-[13px] font-medium text-fg-3",
        "transition-colors hover:text-fg-2 data-[state=active]:border-accent data-[state=active]:text-fg",
        "focus-visible:outline-offset-0 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-5 focus-visible:outline-none", className)} {...props} />;
}
