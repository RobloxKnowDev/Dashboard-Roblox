"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/states";
import { Button, buttonStyles } from "@/components/ui/button";

/** Any unexpected error inside a private page: stay in the app, offer a way out. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      <div className="rounded-lg border border-line bg-surface">
        <ErrorState
          title="This page ran into a problem"
          description="Something went wrong while loading it. Your data is safe — try again, or go back to the overview."
          action={
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <Button variant="primary" onClick={reset}>
                  <RotateCcw aria-hidden />
                  Try again
                </Button>
                <Link href="/overview" className={buttonStyles({ variant: "secondary" })}>
                  Overview
                </Link>
              </div>
              {error.digest ? <p className="font-mono text-[11px] text-fg-3">Reference {error.digest}</p> : null}
            </div>
          }
        />
      </div>
    </div>
  );
}
