import type { Messages } from "@/i18n/messages";

/** Human sentence for an activity_logs entry, in the interface language: "created task “Lobby map”". */
export function describeActivity(
  entry: { action: string; entityType: string; entityLabel: string | null; metadata: unknown },
  t: Messages,
): string {
  const a = t.common.activity;
  const entity = (a.entities as Record<string, string>)[entry.entityType] ?? entry.entityType.replace(/_/g, " ");
  const name = entry.entityLabel ? a.quote(entry.entityLabel) : "";
  if (entry.action === "status_changed") {
    const to = (entry.metadata as { to?: unknown } | null)?.to;
    const statuses: Record<string, string> = { ...t.common.status.game, ...t.common.status.project, ...t.common.status.task };
    const toLabel = typeof to === "string" ? (statuses[to] ?? to.replace(/_/g, " ")) : a.newStatus;
    return a.moved(entity, name, toLabel);
  }
  if (entry.action === "created") return a.created(entity, name);
  if (entry.action === "deleted") return a.deleted(entity, name);
  return a.updated(entity, name);
}
