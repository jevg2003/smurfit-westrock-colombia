import { describe, expect, it } from "vitest";
import { compareSeverity, maxSeverity } from "./severity";

describe("severity", () => {
  it("orders alert above watch above info", () => {
    expect(compareSeverity("alert", "watch")).toBeGreaterThan(0);
    expect(compareSeverity("watch", "info")).toBeGreaterThan(0);
    expect(compareSeverity("info", "info")).toBe(0);
  });

  it("returns the highest severity", () => {
    expect(maxSeverity("info", "alert")).toBe("alert");
    expect(maxSeverity("watch", "info")).toBe("watch");
  });
});
