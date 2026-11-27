import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/features/settings/settings-nav";
import { getT } from "@/i18n/server";

export default async function SettingsLayout({ children }: LayoutProps<"/[lang]/settings">) {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader eyebrow={t.nav.sections.system} title={t.nav.items.settings.title} description={t.settings.header.description} />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-52 lg:shrink-0">
          <SettingsNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageContainer>
  );
}
