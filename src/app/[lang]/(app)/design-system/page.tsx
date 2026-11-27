import type { Metadata } from "next";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ColorFoundations, TypeFoundations } from "@/features/design-system/foundations";
import { ComponentsPlayground } from "@/features/design-system/playground";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.designSystem.title };
}

const SECTIONS = ["colors", "typography", "buttons", "forms", "badges", "stat-cards", "charts", "tables", "overlays", "states"] as const;

/** Internal reference: every component and its states, in one place. */
export default async function DesignSystemPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.designSystem.eyebrow} title={t.designSystem.title} description={t.designSystem.description} />
      <nav aria-label={t.designSystem.sectionsNav} className="flex flex-wrap gap-1.5">
        {SECTIONS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-fg-3 transition-colors hover:border-line-strong hover:text-fg"
          >
            {t.designSystem.sections[id]}
          </a>
        ))}
      </nav>
      <DemoBanner>{t.designSystem.demoBanner}</DemoBanner>
      <ColorFoundations t={t} />
      <TypeFoundations t={t} />
      <ComponentsPlayground />
    </PageContainer>
  );
}
