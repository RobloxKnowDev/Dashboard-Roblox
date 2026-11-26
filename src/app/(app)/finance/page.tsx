import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/feedback/coming-soon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlannedPage } from "@/components/layout/planned-page";
import { RequireRole } from "@/components/layout/session-widgets";

export const metadata: Metadata = { title: "Finance" };

export default function FinancePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Finance"
        eyebrow="Business"
        description="Revenue, expenses and profit, in USD."
        actions={
          <ComingSoonButton variant="primary">
            <Plus aria-hidden />
            Add transaction
          </ComingSoonButton>
        }
      />
      <RequireRole min="admin">
        <PlannedPage
          milestone="Milestone D"
          sections={[
            "Total and monthly revenue",
            "Expenses: development, advertising, tools",
            "Estimated profit",
            "Revenue, expenses and profit history",
            "Revenue per game",
            "Manual transactions"
          ]}
        />
      </RequireRole>
    </PageContainer>
  );
}
