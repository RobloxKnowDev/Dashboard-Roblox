"use client";

import { CalendarDays, ListTodo } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/input";
import { Progress } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PROJECT_STATUS } from "@/features/shared/status";
import { useFormat, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";
import { initials, type Formatters } from "@/lib/utils/format";
import type { ProjectItem } from "./data";
import { parseProjectTab, PROJECT_TABS } from "./tabs";

const VIEWS = ["cards", "table"] as const;

function tabOptions(t: Messages) {
  return PROJECT_TABS.map((value) => ({ value, label: t.projects.tabs[value] }));
}

/* ─────────────────────────── Toolbar (URL state) ─────────────────────────── */

export function ProjectsToolbar() {
  const t = useT();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const tab = parseProjectTab(params.get("tab"));
  const view = params.get("view") === "table" ? "table" : "cards";
  const [query, setQuery] = useState(params.get("q") ?? "");

  function update(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params);
    if (value === fallback || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounced search → ?q=
  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", query.trim(), ""), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        value={tab}
        onValueChange={(v) => update("tab", v, "active")}
        options={tabOptions(t)}
        aria-label={t.projects.toolbar.filterLabel}
      />
      <SearchInput
        aria-label={t.projects.toolbar.searchLabel}
        placeholder={t.projects.toolbar.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-56"
      />
      <div className="ml-auto">
        <SegmentedControl
          value={view}
          onValueChange={(v) => update("view", v, "cards")}
          options={VIEWS.map((value) => ({ value, label: t.projects.toolbar.views[value] }))}
          aria-label={t.projects.toolbar.layoutLabel}
        />
      </div>
    </div>
  );
}

export function ProjectsToolbarFallback() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl value="active" onValueChange={() => {}} options={tabOptions(t)} aria-label={t.projects.toolbar.filterLabel} />
      <SearchInput
        aria-label={t.projects.toolbar.searchLabel}
        placeholder={t.projects.toolbar.searchPlaceholder}
        className="w-full sm:w-56"
        disabled
      />
    </div>
  );
}

/* ─────────────────────────────── Cards ─────────────────────────────── */

export function ProjectCover({ project, className }: { project: ProjectItem; className?: string }) {
  const src = project.coverImageUrl ?? project.game?.iconUrl ?? null;
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {src ? (
        <Image src={src} alt="" fill unoptimized sizes="400px" className="object-cover opacity-90" />
      ) : (
        <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgb(198_242_78/0.14),transparent_60%),linear-gradient(135deg,var(--color-surface-2),var(--color-surface-3))]">
          <span className="font-display text-2xl font-semibold text-fg-3">{initials(project.name)}</span>
        </div>
      )}
    </div>
  );
}

function dueText(project: ProjectItem, t: Messages, f: Formatters) {
  const c = t.projects.card;
  if (project.status === "completed") return project.completedAt ? c.shipped(f.formatDate(project.completedAt)) : c.completed;
  return project.targetReleaseDate ? c.target(f.formatDate(project.targetReleaseDate)) : c.noTargetDate;
}

export function ProjectCards({ projects }: { projects: ProjectItem[] }) {
  const t = useT();
  const f = useFormat();
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => {
        const status = PROJECT_STATUS[project.status];
        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <ProjectCover project={project} className="h-28 border-b border-line" />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-fg group-hover:text-accent">{project.name}</h3>
                  <Badge tone={status.tone} dot className="shrink-0">
                    {t.common.status.project[project.status]}
                  </Badge>
                </div>
                <p className="line-clamp-2 min-h-[2.5em] text-xs leading-relaxed text-fg-3">
                  {project.description || t.projects.card.noDescription}
                </p>
                <div>
                  <div className="mb-1.5 flex justify-between text-[11px] text-fg-3">
                    <span>{t.projects.card.progress}</span>
                    <span className="tabular text-fg-2">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} label={t.projects.card.progressLabel(project.name)} tone={project.status === "completed" ? "good" : "accent"} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-[11px] text-fg-3">
                  {project.members.length ? <AvatarGroup people={project.members} size="xs" /> : <span>{t.projects.card.noMembers}</span>}
                  <span className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <ListTodo className="size-3" aria-hidden />
                      {project.tasks.done}/{project.tasks.done + project.tasks.open}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" aria-hidden />
                      {dueText(project, t, f)}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────── Table ─────────────────────────────── */

export function ProjectTable({ projects }: { projects: ProjectItem[] }) {
  const t = useT();
  const f = useFormat();
  const c = t.projects.table;
  const router = useRouter();
  const columns: Column<ProjectItem>[] = [
    {
      id: "name",
      header: c.project,
      sortValue: (p) => p.name.toLowerCase(),
      cell: (p) => (
        <Link href={`/projects/${p.id}`} className="font-medium text-fg hover:text-accent" onClick={(e) => e.stopPropagation()}>
          {p.name}
        </Link>
      ),
    },
    {
      id: "status",
      header: c.status,
      sortValue: (p) => p.status,
      cell: (p) => (
        <Badge tone={PROJECT_STATUS[p.status].tone} dot>
          {t.common.status.project[p.status]}
        </Badge>
      ),
    },
    {
      id: "progress",
      header: c.progress,
      sortValue: (p) => p.progress,
      cell: (p) => (
        <div className="flex w-32 items-center gap-2">
          <Progress value={p.progress} label={t.projects.card.progressLabel(p.name)} className="flex-1" />
          <span className="w-9 text-right text-xs tabular">{p.progress}%</span>
        </div>
      ),
    },
    {
      id: "members",
      header: c.members,
      cell: (p) => (p.members.length ? <AvatarGroup people={p.members} size="xs" /> : <span className="text-fg-3">—</span>),
    },
    {
      id: "tasks",
      header: c.tasks,
      sortValue: (p) => p.tasks.open,
      cell: (p) => <span className="tabular">{c.openTasks(p.tasks.open)}</span>,
    },
    {
      id: "target",
      header: c.target,
      align: "right",
      sortValue: (p) => p.targetReleaseDate,
      cell: (p) => <span className="tabular">{p.targetReleaseDate ? f.formatDate(p.targetReleaseDate) : "—"}</span>,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <DataTable
        columns={columns}
        rows={projects}
        getRowId={(p) => p.id}
        onRowClick={(p) => router.push(`/projects/${p.id}`)}
        caption={c.caption}
        pageSize={15}
      />
    </div>
  );
}

