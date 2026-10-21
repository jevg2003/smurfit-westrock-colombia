import { describe, expect, it } from "vitest";
import type { RowState } from "./snapshots";
import { summarizeHealth } from "./health-summary";

const rows = (...states: RowState[]) => states.map((state) => ({ snapshot: { state } }));

describe("summarizeHealth", () => {
  it("counts only enabled sources and treats ok and empty answers as working", () => {
    expect(summarizeHealth(rows("ok", "empty", "error", "disabled", "disabled"))).toMatchObject({ working: 2, enabled: 3 });
  });

  it("counts stale, pending and unchecked sources as enabled but not working", () => {
    expect(summarizeHealth(rows("ok", "stale", "pending", "unchecked"))).toMatchObject({ working: 1, enabled: 4 });
  });

  it("picks the badge tone from how many work", () => {
    expect(summarizeHealth(rows("ok", "ok")).tone).toBe("success-light");
    expect(summarizeHealth(rows("ok", "error")).tone).toBe("warning-light");
    expect(summarizeHealth(rows("error", "error")).tone).toBe("destructive-light");
    expect(summarizeHealth(rows("disabled")).tone).toBe("invert-light");
  });
});
