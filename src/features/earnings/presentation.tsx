"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils/cn";

type Presentation = { active: boolean; toggle: () => void };
const PresentationContext = createContext<Presentation | null>(null);

/**
 * Wraps a page so it can go full screen on its own: no sidebar, no top bar,
 * nothing but the figures (handy for a screenshot or a screen share).
 */
export function PresentationArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const update = () => setActive(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.();
  };
  return (
    <PresentationContext value={{ active, toggle }}>
      <div ref={ref} className={cn(active && "overflow-y-auto bg-canvas")}>
        {children}
      </div>
    </PresentationContext>
  );
}

/** The page's "Full screen" button (hidden where the browser can't do it, e.g. iPhone). */
export function PresentationButton() {
  const t = useT();
  const presentation = use(PresentationContext);
  const hydrated = useHydrated();
  if (!presentation || !hydrated || !document.fullscreenEnabled) return null;
  return (
    <Button variant="outline" size="sm" onClick={presentation.toggle}>
      {presentation.active ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
      {presentation.active ? t.earnings.page.exitPresent : t.earnings.page.present}
    </Button>
  );
}
