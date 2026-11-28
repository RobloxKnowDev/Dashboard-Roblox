import { describe, expect, it } from "vitest";
import {
  agentNameFromCwd,
  baseName,
  bridgePlan,
  clip,
  isMessageImage,
  missionFromPrompt,
  redactSecrets,
  sniffImage,
  summarizeTool,
} from "@/features/agents/ingest";
import { AGENT_ROLES, isAgentRole, isMemberRole, MEMBER_ROLES, MISSION_ROLES, missionSystemPrompt } from "@/features/agents/roles";

describe("agent ingestion helpers", () => {
  it("clips long texts on a word boundary", () => {
    expect(clip("short", 10)).toBe("short");
    const long = clip("one two three four five six seven", 20);
    expect(long.length).toBeLessThanOrEqual(20);
    expect(long.endsWith("…")).toBe(true);
  });

  it("masks secrets in commands", () => {
    expect(redactSecrets("curl -H 'Authorization: Bearer abc.def'")).not.toContain("abc.def");
    expect(redactSecrets("API_KEY=supersecretvalue npm start")).toBe("API_KEY=••• npm start");
    // Built from parts so the repository's secret scan doesn't flag this fake key.
    const fakeKey = ["sk", "ant", "api03", "abcdefghijklmnop"].join("-");
    expect(redactSecrets(`use ${fakeKey} now`)).toBe("use ••• now");
    expect(redactSecrets(`token ${"a".repeat(48)}`)).not.toContain("a".repeat(48));
    expect(redactSecrets("npm run check")).toBe("npm run check");
  });

  it("summarizes tool calls without contents", () => {
    expect(summarizeTool("Read", { file_path: "a.ts" })).toBeNull();
    expect(summarizeTool("Edit", { file_path: "E:\\Games\\Glider\\src\\Menu.lua", old_string: "x", new_string: "y" })).toEqual({ kind: "edit", target: "Menu.lua" });
    expect(summarizeTool("Bash", { command: "npm run check", description: "Run the checks" })).toEqual({ kind: "command", target: "Run the checks" });
    expect(summarizeTool("Bash", { command: "TOKEN=abcdef123456 node x.mjs\nsecond line" })).toEqual({ kind: "command", target: "TOKEN=••• node x.mjs" });
    expect(summarizeTool("WebFetch", { url: "https://create.roblox.com/docs/x" })).toEqual({ kind: "fetch", target: "create.roblox.com" });
    expect(summarizeTool("mcp__Roblox_Studio__screen_capture", {})).toEqual({ kind: "mcp", server: "Roblox Studio", target: "screen_capture" });
    expect(summarizeTool("Agent", { description: "Find usages" })).toEqual({ kind: "subagent", target: "Find usages" });
    expect(summarizeTool("SomethingNew", {})).toEqual({ kind: "tool", target: "SomethingNew" });
  });

  it("names agents after their folder and missions after the first line", () => {
    expect(baseName("e:\\Roblox\\RobloxProjects\\Site Dashboard")).toBe("Site Dashboard");
    expect(agentNameFromCwd("/home/me/glider/")).toBe("glider");
    expect(agentNameFromCwd(undefined)).toBe("Claude Code");
    expect(missionFromPrompt("\n  Fix the shop UI\nmore details")).toBe("Fix the shop UI");
  });

  it("plans how the bridge continues a conversation", () => {
    const alive = new Set(["s-open"]);
    expect(bridgePlan({ origin: "mission", session_id: null }, alive)).toEqual({ resume: null, fork: false });
    expect(bridgePlan({ origin: "mission", session_id: "s1" }, alive)).toEqual({ resume: "s1", fork: false });
    expect(bridgePlan({ origin: "claude_code", session_id: "s-open" }, alive)).toEqual({ resume: "s-open", fork: true });
    expect(bridgePlan({ origin: "claude_code", session_id: "s-closed" }, alive)).toEqual({ resume: "s-closed", fork: false });
  });

  it("accepts only real images", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("agent roles", () => {
  it("gives every role instructions that mention the dashboard", () => {
    for (const role of AGENT_ROLES) expect(missionSystemPrompt(role)).toContain("dashboard");
    expect(missionSystemPrompt("ui")).toContain("screen_capture");
    expect(isAgentRole("ui")).toBe(true);
    expect(isAgentRole("hacker")).toBe(false);
  });

  it("builds a team: the manager delegates, members report back", () => {
    expect(MEMBER_ROLES).not.toContain("manager");
    expect(MISSION_ROLES).not.toContain("manager");
    expect(isMemberRole("sfx")).toBe(true);
    expect(isMemberRole("manager")).toBe(false);
    const manager = missionSystemPrompt("manager", true);
    expect(manager).toContain("delegate");
    expect(manager).toContain("ask for their OK");
    expect(manager).not.toContain("report to the manager");
    expect(missionSystemPrompt("sfx", true)).toContain("report to the manager");
    expect(missionSystemPrompt("sfx", false)).not.toContain("report to the manager");
    expect(missionSystemPrompt("game_designer", true)).toContain("Guide Tizzy");
    expect(missionSystemPrompt("ui")).toContain("ui-resources.com");
  });
});

describe("isMessageImage", () => {
  const agent = "3f2b8c1e-1d2a-4b5c-9e8f-0a1b2c3d4e5f";
  const file = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  it("accepts an image uploaded for this agent", () => {
    expect(isMessageImage(`messages/${agent}/${file}.png`, agent)).toBe(true);
    expect(isMessageImage(`messages/${agent}/${file}.webp`, agent)).toBe(true);
  });
  it("refuses another agent's folder, other types and path tricks", () => {
    expect(isMessageImage(`messages/${file}/${file}.png`, agent)).toBe(false);
    expect(isMessageImage(`messages/${agent}/${file}.gif`, agent)).toBe(false);
    expect(isMessageImage(`${agent}/${file}.png`, agent)).toBe(false);
    expect(isMessageImage(`messages/${agent}/../${file}.png`, agent)).toBe(false);
  });
});
