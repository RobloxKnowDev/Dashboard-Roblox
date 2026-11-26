import { CircleCheck, CircleDashed, TriangleExclamationPoint } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ComingSoonPanel } from "@/components/feedback/coming-soon";
import { RequireRole } from "@/components/layout/session-widgets";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { environmentStatus } from "@/lib/env-status";

export const metadata: Metadata = { title: "API configuration" };

async function EnvironmentTable() {
  await connection();
  const vars = environmentStatus();
  return (
    <Card>
      <Table>
        <caption className="sr-only">Environment variables</caption>
        <THead>
          <TR>
            <TH>Variable</TH>
            <TH className="hidden md:table-cell">Used for</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {vars.map((v) => (
            <TR key={v.name}>
              <TD>
                <p className="font-mono text-xs text-fg">{v.name}</p>
                <p className="mt-0.5 text-[11px] text-fg-3">{v.scope === "public" ? "Public (browser)" : "Server only"}</p>
              </TD>
              <TD className="hidden text-xs text-fg-2 md:table-cell">{v.purpose}</TD>
              <TD>
                {v.configured ? (
                  <Badge tone="good" icon={<CircleCheck aria-hidden />}>
                    Configured
                  </Badge>
                ) : v.required ? (
                  <Badge tone="critical" icon={<TriangleExclamationPoint aria-hidden />}>
                    Missing
                  </Badge>
                ) : (
                  <Badge icon={<CircleDashed aria-hidden />}>Not set</Badge>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export default function ApiSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="api" />
      <RequireRole min="owner">
        <div className="space-y-4">
          <p className="text-[13px] text-fg-3">
            Keys live in the server environment (Vercel → Settings → Environment Variables, and .env.local in development). This page only
            says whether each one is set — values are never shown or stored in the database.
          </p>
          <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
            <EnvironmentTable />
          </Suspense>
          <ComingSoonPanel title="Agent ingestion tokens" description="Tokens your AI agents will use to report their status and events to the dashboard." />
        </div>
      </RequireRole>
    </>
  );
}
