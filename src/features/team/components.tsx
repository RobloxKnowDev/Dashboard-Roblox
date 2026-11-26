import { Clock, Code, Eye, Shield, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PROJECT_STATUS } from "@/features/shared/status";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils/format";
import type { TeamMember } from "./data";

const ACCESS: Record<string, { label: string; tone: BadgeTone; icon: typeof Shield }> = {
  owner: { label: ROLE_LABELS.owner, tone: "accent", icon: ShieldCheck },
  admin: { label: ROLE_LABELS.admin, tone: "info", icon: Shield },
  developer: { label: ROLE_LABELS.developer, tone: "neutral", icon: Code },
  viewer: { label: ROLE_LABELS.viewer, tone: "neutral", icon: Eye },
  pending: { label: "Pending approval", tone: "warning", icon: Clock },
  none: { label: "No account", tone: "neutral", icon: UserRound },
};

export function AccessBadge({ access }: { access: TeamMember["access"] }) {
  const config = ACCESS[access ?? "pending"] ?? ACCESS.none!;
  const Icon = config.icon;
  return (
    <Badge tone={config.tone} icon={<Icon aria-hidden />}>
      {config.label}
    </Badge>
  );
}

export function MemberCards({ members }: { members: TeamMember[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
                <p className="truncate text-xs text-fg-3">{m.studioRole || "No job title"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <AccessBadge access={m.access} />
                {m.status === "inactive" ? <Badge dot>Inactive</Badge> : null}
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 rounded-md border border-line bg-surface-2/40 px-3 py-2.5 text-center">
              <div>
                <dt className="text-[11px] text-fg-3">Projects</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.projects.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-3">Open tasks</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.tasks.open}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-fg-3">Done</dt>
                <dd className="text-sm font-semibold tabular text-fg">{m.tasks.done}</dd>
              </div>
            </dl>

            <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5">
              {m.projects.length === 0 ? (
                <span className="text-xs text-fg-3">No projects yet</span>
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
              <span className="ml-auto text-[11px] text-fg-3">Since {formatDate(m.joinedAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
