import { describe, expect, it } from "vitest";
import { demoReply } from "@/features/assistant/demo";
import { parseBlocks } from "@/features/assistant/markdown";
import { chatHistorySchema, MAX_MESSAGE_LENGTH } from "@/features/assistant/types";

describe("assistant markdown", () => {
  it("splits headings, lists and paragraphs", () => {
    const blocks = parseBlocks("### Title\nFirst line\ncontinues\n\n- a\n- b\n1. one\n2. two\n\nEnd");
    expect(blocks).toEqual([
      { kind: "heading", text: "Title" },
      { kind: "p", text: "First line continues" },
      { kind: "ul", items: ["a", "b"] },
      { kind: "ol", items: ["one", "two"] },
      { kind: "p", text: "End" },
    ]);
  });

  it("parses tables (header, separator, rows) and leaves lone pipes alone", () => {
    const blocks = parseBlocks("Sizes:\n| Screen | Scale |\n|---|:-:|\n| PC | 1,30 |\n| Phone | 0,93 |\nAfter\n| not a table |");
    expect(blocks).toEqual([
      { kind: "p", text: "Sizes:" },
      { kind: "table", header: ["Screen", "Scale"], rows: [["PC", "1,30"], ["Phone", "0,93"]] },
      { kind: "p", text: "After | not a table |" },
    ]);
  });
});

describe("demo replies", () => {
  it("routes by topic and falls back to the demo explanation", () => {
    expect(demoReply("How did revenue evolve?")).toContain("Revenue, last 30 days");
    expect(demoReply("Which game has the best retention?")).toContain("Retention");
    expect(demoReply("hello")).toContain("demo mode");
  });
});

describe("chat history validation", () => {
  it("rejects empty and oversized messages", () => {
    expect(chatHistorySchema.safeParse([]).success).toBe(false);
    expect(chatHistorySchema.safeParse([{ role: "user", content: "   " }]).success).toBe(false);
    expect(chatHistorySchema.safeParse([{ role: "user", content: "x".repeat(MAX_MESSAGE_LENGTH + 1) }]).success).toBe(false);
    expect(chatHistorySchema.safeParse([{ role: "user", content: "Hi" }]).success).toBe(true);
    expect(chatHistorySchema.safeParse([{ role: "system", content: "Hi" }]).success).toBe(false);
  });
});
