import { CircleCheck, CircleDashed, Monitor, TriangleExclamationPoint } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RequireRole } from "@/components/layout/session-widgets";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { listMachines } from "@/features/agents/data";
import { getI18n, getT } from "@/i18n/server";
import { environmentStatus, robloxKeyCount } from "@/lib/env-status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.api };
}

async function EnvironmentTable() {
  await connection();
  const t = await getT();
  const vars = environmentStatus();
  const robloxKeys = robloxKeyCount();
  return (
    <Card>
      <Table>
        <caption className="sr-only">{t.settings.api.caption}</caption>
        <THead>
          <TR>
            <TH>{t.settings.api.variable}</TH>
            <TH className="hidden md:table-cell">{t.settings.api.usedFor}</TH>
            <TH>{t.settings.api.status}</TH>
          </TR>
        </THead>
        <TBody>
          {vars.map((v) => (
            <TR key={v.name}>
              <TD>
                <p className="font-mono text-xs text-fg">{v.name}</p>
                <p className="mt-0.5 text-[11px] text-fg-3">{v.scope === "public" ? t.settings.api.public : t.settings.api.server}</p>
              </TD>
              <TD className="hidden text-xs text-fg-2 md:table-cell">
                {v.id === "robloxKeys" && robloxKeys > 0 ? t.settings.api.robloxKeysConfigured(robloxKeys) : t.settings.api.purposes[v.id]}
              </TD>
              <TD>
                {v.configured ? (
                  <Badge tone="good" icon={<CircleCheck aria-hidden />}>
                    {t.settings.api.configured}
                  </Badge>
                ) : v.required ? (
                  <Badge tone="critical" icon={<TriangleExclamationPoint aria-hidden />}>
                    {t.settings.api.missing}
                  </Badge>
                ) : (
                  <Badge icon={<CircleDashed aria-hidden />}>{t.settings.api.notSet}</Badge>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

/** PCs whose Claude Code reports to the dashboard (machine tokens, docs/AGENTS.md). */
async function AgentMachines() {
  await connection();
  const now = new Date();
  const [{ t, f }, machines] = await Promise.all([getI18n(), listMachines()]);
  const a = t.settings.api;
  return (
    <Card>
      <CardHeader title={a.agentTokensTitle} description={a.agentTokensDescription} />
      {machines.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-fg-3">{a.agentMachinesEmpty}</p>
      ) : (
        <ul className="px-5 pb-4">
          {machines.map((machine) => (
            <li key={machine.id} className="flex items-center gap-2 border-t border-line py-2.5 text-[13px] first:border-t-0">
              <Monitor className="size-3.5 text-fg-3" aria-hidden />
              <span className="font-medium text-fg">{machine.name}</span>
              <span className="text-xs text-fg-3">· {machine.lastSeenAt ? a.agentMachineSeen(f.formatRelative(machine.lastSeenAt, now)) : a.agentMachineNever}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function ApiSettingsPage() {
  const t = await getT();
  return (
    <>
      <SettingsSectionHeader slug="api" />
      <RequireRole min="owner">
        <div className="space-y-4">
          <p className="text-[13px] text-fg-3">{t.settings.api.intro}</p>
          <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
            <EnvironmentTable />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-32 rounded-lg" />}>
            <AgentMachines />
          </Suspense>
        </div>
      </RequireRole>
    </>
  );
}
