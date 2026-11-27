/**
 * Project list filters. Kept out of the "use client" views module: values
 * imported from a client module into a Server Component are client
 * references, not the actual array. Labels: t.projects.tabs[value].
 */
export const PROJECT_TABS = ["active", "completed", "all"] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

export function parseProjectTab(value: unknown): ProjectTab {
  return PROJECT_TABS.find((t) => t === value) ?? "active";
}
