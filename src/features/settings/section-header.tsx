import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { settingsSections } from "./sections";

/** Title block for a settings section, read from the shared section list. */
export function SettingsSectionHeader({ slug }: { slug: string }) {
  const section = settingsSections.find((s) => s.slug === slug);
  if (!section) notFound();
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
      <div>
        <h2 className="text-base font-semibold text-fg">{section.title}</h2>
        <p className="mt-1 text-[13px] text-fg-3">{section.description}</p>
      </div>
      {section.minRole && section.minRole !== "viewer" ? (
        <Badge tone="neutral">{ROLE_LABELS[section.minRole]}+</Badge>
      ) : null}
    </div>
  );
}
