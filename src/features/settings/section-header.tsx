import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import { settingsSections, type SettingsSlug } from "./sections";

/** Title block for a settings section, read from the shared section list. */
export async function SettingsSectionHeader({ slug }: { slug: SettingsSlug }) {
  const section = settingsSections.find((s) => s.slug === slug);
  if (!section) notFound();
  const t = await getT();
  const text = t.settings.sections[section.slug];
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
      <div>
        <h2 className="text-base font-semibold text-fg">{text.title}</h2>
        <p className="mt-1 text-[13px] text-fg-3">{text.description}</p>
      </div>
      {section.minRole && section.minRole !== "viewer" ? (
        <Badge tone="neutral">{t.common.roles[section.minRole]}+</Badge>
      ) : null}
    </div>
  );
}
