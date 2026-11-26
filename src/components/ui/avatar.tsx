"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-14 text-base",
} as const;

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full",
        "bg-surface-3 font-semibold text-fg-2 ring-1 ring-line-strong",
        sizes[size],
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={src ? 400 : 0} aria-label={name}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/** Overlapping avatars with a "+N" overflow chip. */
export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
}: {
  people: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((person) => (
        <Avatar key={person.name} name={person.name} src={person.avatarUrl} size={size} className="ring-2 ring-surface" />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-3 font-medium text-fg-2 ring-2 ring-surface",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
