import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";

/** Public authentication pages: centered panel, no app chrome. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Discreet backdrop: hairline grid fading out, faint accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-[36rem] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-3xl"
      />

      <main className="relative w-full max-w-sm animate-rise-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-line-strong bg-surface/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-7">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-fg-3">
          Private workspace · Access by invitation only
        </p>
      </main>
      <footer className="relative mt-auto pt-10 font-mono text-[10px] uppercase tracking-wider text-fg-3">
        {siteConfig.name}
      </footer>
    </div>
  );
}
