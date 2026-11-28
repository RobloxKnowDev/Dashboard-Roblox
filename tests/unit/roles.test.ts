import { describe, expect, it } from "vitest";
import { APP_ROLES, can, hasMinRole, type AppRole, type Permission } from "@/lib/auth/roles";

/** The permission matrix validated for Phase 1 (docs/ARCHITECTURE.md §6). */
const EXPECTED: Record<Permission, AppRole[]> = {
  "studio.read": ["owner", "admin", "developer", "viewer"],
  "work.write": ["owner", "admin", "developer"],
  "agents.read": ["owner", "admin"],
  "work.delete_any": ["owner", "admin"],
  "games.manage": ["owner", "admin"],
  "finance.read": ["owner", "admin"],
  "finance.write": ["owner", "admin"],
  "members.manage": ["owner", "admin"],
  "roles.manage": ["owner"],
  "integrations.manage": ["owner", "admin"],
  "settings.manage": ["owner", "admin"],
};

describe("permission matrix", () => {
  for (const [permission, allowed] of Object.entries(EXPECTED) as [Permission, AppRole[]][]) {
    it(`${permission} → ${allowed.join(", ")}`, () => {
      for (const role of APP_ROLES) {
        expect(can(role, permission)).toBe(allowed.includes(role));
      }
    });
  }

  it("orders roles owner > admin > developer > viewer", () => {
    expect(hasMinRole("owner", "admin")).toBe(true);
    expect(hasMinRole("admin", "owner")).toBe(false);
    expect(hasMinRole("developer", "viewer")).toBe(true);
    expect(hasMinRole("viewer", "developer")).toBe(false);
  });
});
