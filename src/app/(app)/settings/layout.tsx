import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/features/settings/settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <PageContainer>
      <PageHeader eyebrow="System" title="Settings" description="Studio configuration, your account and access control." />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-52 lg:shrink-0">
          <SettingsNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageContainer>
  );
}
