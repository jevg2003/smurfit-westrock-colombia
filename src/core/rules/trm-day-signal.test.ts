import { describe, expect, it } from "vitest";
import { buildTrmDaySignal, trmDaySignalId } from "./trm-daily-move";

describe("buildTrmDaySignal", () => {
  it("builds a deterministic id from the day", () => {
    expect(trmDaySignalId("2026-10-01T00:00:00.000")).toBe("trm.daily-move.v1:trm:2026-10-01T00:00:00.000");
  });

  it("builds a macro signal with trm provenance and the active threshold in the rule text", () => {
    const signal = buildTrmDaySignal({ date: "2026-10-01T00:00:00.000", thresholdPct: 2, fetchedAt: "2026-10-20T12:00:00.000Z" });
    expect(signal).toMatchObject({
      id: "trm.daily-move.v1:trm:2026-10-01T00:00:00.000",
      ruleId: "trm.daily-move.v1",
      dimension: "macro",
      occurredAt: "2026-10-01T00:00:00.000",
    });
    expect(signal.ruleText).toContain("2%");
    expect(signal.provenance[0]).toMatchObject({ sourceId: "trm", fetchedAt: "2026-10-20T12:00:00.000Z" });
    expect(signal.evidence).toEqual([{ kind: "observation", ref: "trm:2026-10-01T00:00:00.000" }]);
  });
});
