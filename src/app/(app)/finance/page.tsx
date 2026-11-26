import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartSkeleton, ListSkeleton } from "@/components/feedback/states";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/layout/session-widgets";
import { Skeleton } from "@/components/ui/primitives";
import { checkAccess } from "@/lib/auth/session";
import {
  AddTransactionAction,
  FinanceCharts,
  FinanceKpis,
  RobloxEarnings,
  TransactionsSection,
} from "@/features/finance/sections";

export const metadata: Metadata = { title: "Finance" };

async function HeaderAction() {
  const access = await checkAccess("admin");
  if (access.status !== "allowed") return null;
  return <AddTransactionAction />;
}

export default function FinancePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Finance"
        eyebrow="Business"
        description="Revenue, expenses and profit from the transactions you record, in USD."
        actions={
          <Suspense fallback={null}>
            <HeaderAction />
          </Suspense>
        }
      />
      <RequireRole min="admin">
        <Suspense
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading indicators">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[108px] rounded-lg" />
              ))}
            </div>
          }
        >
          <FinanceKpis />
        </Suspense>

        <Suspense
          fallback={
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <ChartSkeleton key={i} />
              ))}
            </div>
          }
        >
          <FinanceCharts />
        </Suspense>

        <section aria-labelledby="transactions-heading" className="space-y-3">
          <h2 id="transactions-heading" className="text-sm font-semibold text-fg">
            Transactions
          </h2>
          <Suspense
            fallback={
              <div className="rounded-lg border border-line bg-surface">
                <ListSkeleton rows={6} />
              </div>
            }
          >
            <TransactionsSection />
          </Suspense>
        </section>

        <Suspense fallback={<Skeleton className="h-48 rounded-lg" />}>
          <RobloxEarnings />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
