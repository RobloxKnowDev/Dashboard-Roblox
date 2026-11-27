import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { IntegrationsOverview } from "@/features/settings/integrations";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.items.integrations.title };
}

export default async function IntegrationsPage() {
  const t = await getT();
  return (
    <PageContainer>
      <PageHeader title={t.nav.items.integrations.title} eyebrow={t.nav.sections.system} description={t.integrations.description} />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          }
        >
          <IntegrationsOverview />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
