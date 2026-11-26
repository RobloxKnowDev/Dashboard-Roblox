import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-line-strong bg-surface-2 text-fg-3">
        <Compass className="size-5" aria-hidden />
      </div>
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-fg-3">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-[13px] text-fg-3">The link may be outdated, or the item was deleted.</p>
      <Link href="/overview" className={buttonStyles({ variant: "primary", className: "mt-6" })}>
        Back to overview
      </Link>
    </main>
  );
}
