/**
 * Roles and the permission matrix (docs/ARCHITECTURE.md §6).
 * The same rules are enforced in PostgreSQL RLS policies — the UI checks
 * here only decide what to show; the database decides what is allowed.
 */
export const APP_ROLES = ["owner", "admin", "developer", "viewer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const RANK: Record<AppRole, number> = { viewer: 0, developer: 1, admin: 2, owner: 3 };

export function hasMinRole(role: AppRole, minRole: AppRole): boolean {
  return RANK[role] >= RANK[minRole];
}

export const PERMISSIONS = {
  "studio.read": "viewer",
  "work.write": "developer", // projects, tasks, ideas, watchlist
  "agents.read": "admin", // AI agents and their results (talking to them: the agent controller only)
  "work.delete_any": "admin",
  "games.manage": "admin",
  "finance.read": "admin",
  "finance.write": "admin",
  "members.manage": "admin",
  "roles.manage": "owner",
  "integrations.manage": "admin",
  "settings.manage": "admin",
} as const satisfies Record<string, AppRole>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AppRole, permission: Permission): boolean {
  return hasMinRole(role, PERMISSIONS[permission]);
}
