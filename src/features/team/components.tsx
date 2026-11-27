import { Clock, Code, Eye, Shield, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PROJECT_STATUS } from "@/features/shared/status";
import { getI18n, getT } from "@/i18n/server";
import type { TeamMember } from "./data";

type AccessKey = "owner" | "admin" | "developer" | "viewer" | "pending" | "none";

/** Labels: t.common.roles[role], or t.team.access.pending / .none. */
const ACCESS: Record<AccessKey, { tone: BadgeTone; icon: typeof Shield }> = {
  owner: { tone: "accent", icon: ShieldCheck },
  admin: { tone: "info", icon: Shield },
  developer: { tone: "neutral", icon: Code },
  viewer: { tone: "neutral", icon: Eye },
  pending: { tone: "warning", icon: Clock },
  none: { tone: "neutral", icon: UserRound },
};

export async function AccessBadge({ access }: { access: TeamMember["access"] }) {
  const t = await getT();
  const key: AccessKey = access ?? "pending";
  const config = ACCESS[key] ?? ACCESS.none;
  const label = key === "pending" || key === "none" ? t.team.access[key] : t.common.roles[key];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone} icon={<Icon aria-hidden />}>
      {label}
    </Badge>
  );
}

export async function MemberCards({ members }: { members: TeamMember[] }) {
  const { t, f } = await getI18n();
  const c = t.team.card;
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {members.map((m) => (
        <li key={m.id}>
          <Link
            href={`/team/${m.id}`}
            className="group flex h-full flex-col gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start gap-3">
              <Avatar name={m.name} src={m.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg group-hover:text-accent">{m.name}</p>
                <p className="truncate text-xs text-fg-3">{m.studioRole || c.noJobTitle}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <AccessBadge access={m.access} />
                {m.status === "inactive" ? <Badge dot>{c.inactive}</Badge> : null}
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 rounded-md border border-line bg-surface-2/40 px-3 py-2.5 text-center">
              <div>
                <dt className="text-[11px] text-fg-3">{c.projects}</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.projects.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-3">{c.openTasks}</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.tasks.open}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-3">{c.done}</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.tasks.done}</dd>
              </div>
            </dl>

            <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5">
              {m.projects.length === 0 ? (
                <span className="text-xs text-fg-3">{c.noProjects}</span>
              ) : (
                <>
                  {m.projects.slice(0, 3).map((p) => (
                    <Badge key={p.id} tone={PROJECT_STATUS[p.status].tone} dot className="max-w-40 truncate">
                      {p.name}
                    </Badge>
                  ))}
                  {m.projects.length > 3 ? <span className="text-xs text-fg-3">+{m.projects.length - 3}</span> : null}
                </>
              )}
              <span className="ml-auto text-[11px] text-fg-3">{c.since(f.formatDate(m.joinedAt))}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
