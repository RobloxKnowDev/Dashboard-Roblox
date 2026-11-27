"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/states";
import { Button, buttonStyles } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** Any unexpected error inside a private page: stay in the app, offer a way out. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      <div className="rounded-lg border border-line bg-surface">
        <ErrorState
          title={t.shell.error.title}
          description={t.shell.error.description}
          action={
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <Button variant="primary" onClick={reset}>
                  <RotateCcw aria-hidden />
                  {t.shell.error.retry}
                </Button>
                <Link href="/overview" className={buttonStyles({ variant: "secondary" })}>
                  {t.nav.items.overview.title}
                </Link>
              </div>
              {error.digest ? <p className="font-mono text-[11px] text-fg-3">Ref. {error.digest}</p> : null}
            </div>
          }
        />
      </div>
    </div>
  );
}
