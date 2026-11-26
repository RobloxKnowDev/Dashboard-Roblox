import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath — open redirect protection", () => {
  it("keeps internal paths, with their query string", () => {
    expect(safeNextPath("/projects")).toBe("/projects");
    expect(safeNextPath("/overview?range=12m")).toBe("/overview?range=12m");
    expect(safeNextPath("/settings/profile")).toBe("/settings/profile");
  });

  it.each([
    ["//evil.example.com", "protocol-relative URL"],
    ["/\\evil.example.com", "backslash trick"],
    ["https://evil.example.com", "absolute URL"],
    ["javascript:alert(1)", "javascript: URL"],
    ["evil.example.com", "relative host"],
    ["/overview\r\nSet-Cookie: x=1", "header injection"],
    ["", "empty"],
  ])("rejects %s (%s)", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("falls back when missing", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("never sends the user back to the auth pages", () => {
    expect(safeNextPath("/login")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath("/login?next=/x")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath("/forgot-password")).toBe(DEFAULT_AFTER_LOGIN);
  });
});
