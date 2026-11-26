import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { APP_ROLES, can, ROLE_LABELS, type Permission } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Permissions" };

const ROWS: { permission: Permission; label: string }[] = [
  { permission: "studio.read", label: "View games, projects, tasks, agents, market and team" },
  { permission: "work.write", label: "Create and edit projects, tasks, ideas and watchlist" },
  { permission: "work.delete_any", label: "Delete other people's projects and tasks" },
  { permission: "games.manage", label: "Add and edit the studio's games" },
  { permission: "finance.read", label: "View finance" },
  { permission: "finance.write", label: "Record transactions" },
  { permission: "members.manage", label: "Create accounts and manage team cards" },
  { permission: "roles.manage", label: "Change roles, revoke access, delete accounts" },
  { permission: "integrations.manage", label: "Manage integrations and API keys" },
  { permission: "settings.manage", label: "Edit studio settings" },
];

/** Rendered from the same permission matrix the app enforces (lib/auth/roles.ts). */
export default function PermissionsSettingsPage() {
  return (
    <>
      <SettingsSectionHeader slug="permissions" />
      <Card>
        <Table>
          <caption className="sr-only">Permissions by role</caption>
          <THead>
            <tr>
              <TH>Capability</TH>
              {APP_ROLES.map((role) => (
                <TH key={role} className="text-center">
                  {ROLE_LABELS[role]}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {ROWS.map((row) => (
              <TR key={row.permission}>
                <TD className="text-fg">{row.label}</TD>
                {APP_ROLES.map((role) =>
                  can(role, row.permission) ? (
                    <TD key={role} className="text-center">
                      <Check className="mx-auto size-4 text-good" aria-label="Allowed" />
                    </TD>
                  ) : (
                    <TD key={role} className="text-center">
                      <Minus className="mx-auto size-4 text-fg-4" aria-label="Not allowed" />
                    </TD>
                  ),
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-fg-3">
        <li>An Administrator can neither remove nor modify an Owner.</li>
        <li>Nobody can change their own role, and the last Owner can never be demoted.</li>
        <li>These rules are enforced by the database itself (row-level security), not only by the interface.</li>
      </ul>
    </>
  );
}
