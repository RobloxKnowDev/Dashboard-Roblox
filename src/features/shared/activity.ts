/** Human sentence for an activity_logs entry: "created task “Lobby map”". */

const ENTITY_LABELS: Record<string, string> = {
  task: "task",
  project: "project",
  game: "game",
  team_member: "member",
  finance_transaction: "transaction",
};

export function describeActivity(entry: { action: string; entityType: string; entityLabel: string | null; metadata: unknown }) {
  const entity = ENTITY_LABELS[entry.entityType] ?? entry.entityType.replace(/_/g, " ");
  const name = entry.entityLabel ? ` “${entry.entityLabel}”` : "";
  if (entry.action === "status_changed") {
    const to = (entry.metadata as { to?: unknown } | null)?.to;
    const toLabel = typeof to === "string" ? to.replace(/_/g, " ") : "a new status";
    return `moved ${entity}${name} to ${toLabel}`;
  }
  const verb = entry.action === "created" ? "created" : entry.action === "deleted" ? "deleted" : "updated";
  return `${verb} ${entity}${name}`;
}
