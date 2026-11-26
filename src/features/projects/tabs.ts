/**
 * Project list filters. Kept out of the "use client" views module: values
 * imported from a client module into a Server Component are client
 * references, not the actual array.
 */
export const PROJECT_TABS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number]["value"];

export function parseProjectTab(value: unknown): ProjectTab {
  return PROJECT_TABS.find((t) => t.value === value)?.value ?? "active";
}
