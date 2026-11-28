import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/**
 * Provisional mark + wordmark. The final name and logo will replace this
 * component only (see config/site.ts).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_0_1px_rgb(51_105_255/0.25),0_4px_16px_-4px_rgb(51_105_255/0.5)]",
        className,
      )}
    >
      {/* Abstract "control panel" glyph: three bars of rising height */}
      <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
        <rect x="2" y="9" width="3" height="5" rx="1" />
        <rect x="6.5" y="5.5" width="3" height="8.5" rx="1" />
        <rect x="11" y="2" width="3" height="12" rx="1" />
      </svg>
    </span>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {collapsed ? (
        <span className="sr-only">{siteConfig.name}</span>
      ) : (
        <span className="font-display text-[15px] font-semibold tracking-tight text-fg">{siteConfig.name}</span>
      )}
    </span>
  );
}
