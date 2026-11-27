"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchInput } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { statusOptions, TASK_PRIORITY } from "@/features/shared/status";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { parseTaskView, TASK_VIEWS, type TaskView } from "./schemas";

const ALL = "all";

function viewOptions(t: Messages) {
  return TASK_VIEWS.map((value) => ({ value, label: t.tasks.views[value] }));
}

/** View tabs + filters, kept in the URL so a filtered list can be shared. */
export function TasksToolbar({ projects }: { projects: { id: string; name: string }[] }) {
  const t = useT();
  const c = t.tasks.toolbar;
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", query.trim()), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<TaskView>
        value={parseTaskView(params.get("view"))}
        onValueChange={(v) => update("view", v)}
        options={viewOptions(t)}
        aria-label={c.viewLabel}
      />
      <Select
        aria-label={c.priorityLabel}
        value={params.get("priority") ?? ALL}
        onValueChange={(v) => update("priority", v)}
        options={[{ value: ALL, label: c.allPriorities }, ...statusOptions(TASK_PRIORITY, t.common.status.priority)]}
        className="w-36"
      />
      <Select
        aria-label={c.projectLabel}
        value={params.get("project") ?? ALL}
        onValueChange={(v) => update("project", v)}
        options={[{ value: ALL, label: c.allProjects }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        className="w-44"
      />
      <SearchInput
        aria-label={c.searchLabel}
        placeholder={c.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-56"
      />
    </div>
  );
}

export function TasksToolbarFallback() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl value="all" onValueChange={() => {}} options={viewOptions(t)} aria-label={t.tasks.toolbar.viewLabel} />
    </div>
  );
}
