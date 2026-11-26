import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAccountSchema, grantableRoles, makeTemporaryPassword } from "@/features/members/schemas";
import { memberSchema } from "@/features/team/schemas";

describe("makeTemporaryPassword", () => {
  it("returns 4 groups of 4 with upper, lower and digit", () => {
    for (let i = 0; i < 200; i++) {
      const p = makeTemporaryPassword((n) => randomBytes(n));
      expect(p).toMatch(/^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });

  it("retries until the rules are met", () => {
    let calls = 0;
    const p = makeTemporaryPassword((n) => {
      calls += 1;
      // First draw: all "A" (no lower case, no digit) → rejected.
      return calls === 1 ? new Uint8Array(n) : randomBytes(n);
    });
    expect(calls).toBeGreaterThan(1);
    expect(p).toMatch(/\d/);
  });
});

describe("account rules", () => {
  it("lets owners grant any role and administrators only developer/viewer", () => {
    expect(grantableRoles("owner")).toEqual(["owner", "admin", "developer", "viewer"]);
    expect(grantableRoles("admin")).toEqual(["developer", "viewer"]);
  });

  it("normalizes and validates the email", () => {
    const ok = createAccountSchema.safeParse({ name: "Sam", email: "  Sam@Example.COM ", role: "developer" });
    expect(ok.success && ok.data.email).toBe("sam@example.com");
    expect(createAccountSchema.safeParse({ name: "Sam", email: "nope", role: "developer" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ name: "", email: "a@b.co", role: "developer" }).success).toBe(false);
  });

  it("validates team member cards", () => {
    const base = { displayName: "Alex", studioRole: "Builder", status: "active", avatarUrl: "", joinedAt: "2026-11-26" };
    expect(memberSchema.safeParse(base).success).toBe(true);
    expect(memberSchema.safeParse({ ...base, avatarUrl: "http://x.com/a.png" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, displayName: " " }).success).toBe(false);
  });
});
