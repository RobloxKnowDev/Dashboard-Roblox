import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/primitives";
import { getProjectFormOptions, listProjects } from "@/features/projects/data";
import { ProjectFormModal } from "@/features/projects/project-form";
import { parseProjectTab } from "@/features/projects/tabs";
import { ProjectCards, ProjectsToolbar, ProjectsToolbarFallback, ProjectTable } from "@/features/projects/views";
import { getT } from "@/i18n/server";
import { checkAccess } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.projects.title };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

async function NewProjectAction() {
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return null;
  return <ProjectFormModal options={await getProjectFormOptions()} />;
}

async function ProjectsSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [projects, access, t] = await Promise.all([listProjects(), checkAccess("developer"), getT()]);
  const c = t.projects.page;
  if (projects === null) return <ErrorState description={c.loadError} />;

  const tab = parseProjectTab(one(params.tab));
  const q = one(params.q)?.toLowerCase().trim();
  const filtered = projects.filter((p) => {
    if (tab === "active" && (p.status === "completed" || p.status === "cancelled")) return false;
    if (tab === "completed" && p.status !== "completed") return false;
    if (q && !`${p.name} ${p.description ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    const none = projects.length === 0;
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={FolderKanban}
          title={none ? c.emptyTitle : c.noMatchTitle}
          description={none ? (access.status === "allowed" ? c.emptyCanCreate : c.emptyReadOnly) : c.noMatchDescription}
          action={none && access.status === "allowed" ? <ProjectFormModal options={await getProjectFormOptions()} /> : undefined}
        />
      </div>
    );
  }

  return one(params.view) === "table" ? <ProjectTable projects={filtered} /> : <ProjectCards projects={filtered} />;
}

export default async function ProjectsPage({ searchParams }: PageProps<"/[lang]/projects">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={t.nav.sections.development}
        title={t.nav.items.projects.title}
        description={t.projects.page.description}
        actions={
          <Suspense fallback={null}>
            <NewProjectAction />
          </Suspense>
        }
      />
      <Suspense fallback={<ProjectsToolbarFallback />}>
        <ProjectsToolbar />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        }
      >
        <ProjectsSection searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
