import type { Metadata } from "next";
import { DemoBanner } from "@/components/feedback/demo-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ColorFoundations, TypeFoundations } from "@/features/design-system/foundations";
import { ComponentsPlayground } from "@/features/design-system/playground";

export const metadata: Metadata = { title: "Design System" };

const SECTIONS = [
  ["colors", "Colors"],
  ["typography", "Typography"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["badges", "Badges"],
  ["stat-cards", "Stat cards"],
  ["charts", "Charts"],
  ["tables", "Tables"],
  ["overlays", "Overlays"],
  ["states", "States"],
] as const;

/** Internal reference: every component and its states, in one place. */
export default function DesignSystemPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Internal"
        title="Design System"
        description="Every building block of the interface and its states. Use it as the reference when building new pages."
      />
      <nav aria-label="Design system sections" className="flex flex-wrap gap-1.5">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-fg-3 transition-colors hover:border-line-strong hover:text-fg"
          >
            {label}
          </a>
        ))}
      </nav>
      <DemoBanner>Sample figures on this page illustrate the components and are not studio data.</DemoBanner>
      <ColorFoundations />
      <TypeFoundations />
      <ComponentsPlayground />
    </PageContainer>
  );
}
