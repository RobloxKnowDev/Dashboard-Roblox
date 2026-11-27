import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SettingsSectionHeader } from "@/features/settings/section-header";
import { getT } from "@/i18n/server";
import { APP_ROLES, can, type Permission } from "@/lib/auth/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.settings.metaTitles.permissions };
}

/** Display order; labels are t.settings.permissions.rows[permission]. */
const ROWS: Permission[] = [
  "studio.read",
  "work.write",
  "work.delete_any",
  "games.manage",
  "finance.read",
  "finance.write",
  "members.manage",
  "roles.manage",
  "integrations.manage",
  "settings.manage",
];

/** Rendered from the same permission matrix the app enforces (lib/auth/roles.ts). */
export default async function PermissionsSettingsPage() {
  const t = await getT();
  return (
    <>
      <SettingsSectionHeader slug="permissions" />
      <Card>
        <Table>
          <caption className="sr-only">{t.settings.permissions.caption}</caption>
          <THead>
            <tr>
              <TH>{t.settings.permissions.capability}</TH>
              {APP_ROLES.map((role) => (
                <TH key={role} className="text-center">
                  {t.common.roles[role]}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {ROWS.map((permission) => (
              <TR key={permission}>
                <TD className="text-fg">{t.settings.permissions.rows[permission]}</TD>
                {APP_ROLES.map((role) =>
                  can(role, permission) ? (
                    <TD key={role} className="text-center">
                      <Check className="mx-auto size-4 text-good" aria-label={t.settings.permissions.allowed} />
                    </TD>
                  ) : (
                    <TD key={role} className="text-center">
                      <Minus className="mx-auto size-4 text-fg-4" aria-label={t.settings.permissions.notAllowed} />
                    </TD>
                  ),
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-fg-3">
        <li>{t.settings.permissions.ruleAdminOwner}</li>
        <li>{t.settings.permissions.ruleOwnRole}</li>
        <li>{t.settings.permissions.ruleDatabase}</li>
      </ul>
    </>
  );
}
