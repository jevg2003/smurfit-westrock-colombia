import { describe, expect, it } from "vitest";

describe("test runner", () => {
  it("resolves the @/ alias", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("a", false, "b")).toBe("a b");
  });
});
