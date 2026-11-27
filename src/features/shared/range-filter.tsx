"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DEFAULT_RANGE, parseRange, RANGE_OPTIONS, type RangeKey } from "@/features/shared/range";
import { useT } from "@/i18n/client";

/**
 * Time range filter. The value lives in the URL (?range=30d), so a view can
 * be bookmarked or shared. While new data loads, the previous render stays
 * on screen (transition) — no flash, no layout jump.
 */
export function RangeFilter() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useT();
  const value = parseRange(params.get("range")).key;

  function onChange(next: RangeKey) {
    const search = new URLSearchParams(params);
    if (next === DEFAULT_RANGE) search.delete("range");
    else search.set("range", next);
    const query = search.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex items-center gap-2">
      {pending ? <LoaderCircle className="size-3.5 animate-spin text-fg-3" aria-label={t.common.states.updating} /> : null}
      <SegmentedControl value={value} onValueChange={onChange} options={RANGE_OPTIONS} aria-label={t.common.ranges.ariaLabel} />
    </div>
  );
}

/** Prerender fallback (the URL isn't known yet): default range, inert. */
export function RangeFilterFallback() {
  const t = useT();
  return (
    <SegmentedControl
      value={DEFAULT_RANGE}
      onValueChange={() => {}}
      options={RANGE_OPTIONS}
      aria-label={t.common.ranges.ariaLabel}
    />
  );
}
