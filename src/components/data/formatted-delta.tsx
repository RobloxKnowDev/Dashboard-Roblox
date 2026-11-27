"use client";

import { useFormat } from "@/i18n/client";

/** "+12.4%" in the interface language (StatCard is shared by server and client trees). */
export function FormattedDelta({ value }: { value: number }) {
  return useFormat().formatDelta(value);
}
