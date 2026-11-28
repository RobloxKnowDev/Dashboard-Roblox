import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/**
 * The studio's mark: public/brand/nexya-mark.png (transparent, drawn for dark
 * backgrounds) with a soft violet glow. The name comes from config/site.ts.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/nexya-mark.png"
      alt=""
      aria-hidden
      width={32}
      height={32}
      priority
      className={cn("size-8 shrink-0 drop-shadow-[0_0_10px_rgb(176_29_251/0.45)]", className)}
    />
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {collapsed ? (
        <span className="sr-only">{siteConfig.name}</span>
      ) : (
        <span className="font-display text-[15px] font-semibold text-fg">{siteConfig.name}</span>
      )}
    </span>
  );
}
