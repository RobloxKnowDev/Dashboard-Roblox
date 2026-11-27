import { describe, expect, it } from "vitest";
import { fitLabel } from "@/components/charts/bar-chart";

describe("bar chart labels", () => {
  it("keeps labels that fit and shortens the others with an ellipsis", () => {
    expect(fitLabel("Search", 12)).toBe("Search");
    expect(fitLabel("GLIDER [1-2 PLAYER OBBY]", 12)).toBe("GLIDER [1-2…");
    expect(fitLabel("Clean Old Stuff", 7)).toBe("Clean…");
    expect(fitLabel("Abcdef", 1)).toBe("A…");
  });
});
