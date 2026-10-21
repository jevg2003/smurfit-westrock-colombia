import { describe, expect, it } from "vitest";
import { detectTrmDailyMoveSignals, trmDaySignalId } from "./trm-daily-move";

const FETCHED = "2026-10-20T15:00:00.000Z";
const records = [
  { validFrom: "2026-10-01T00:00:00.000", value: "4000" },
  { validFrom: "2026-10-02T00:00:00.000", value: "4040" }, // +1.00 % exactly
  { validFrom: "2026-10-03T00:00:00.000", value: "4044" }, // +0.1 %
  { validFrom: "2026-10-04T00:00:00.000", value: "3960" }, // about -2.08 %
];

describe("detectTrmDailyMoveSignals", () => {
  const signals = detectTrmDailyMoveSignals({
    records,
    thresholds: { trmDailyMovePct: 1, trmDailyAlertPct: 2 },
    fetchedAt: FETCHED,
  });

  it("creates a signal for the inclusive threshold and skips quiet days", () => {
    expect(signals.map((signal) => signal.id)).toEqual([
      trmDaySignalId("2026-10-02T00:00:00.000"),
      trmDaySignalId("2026-10-04T00:00:00.000"),
    ]);
  });

  it("is watch below the alert level and alert at or above it", () => {
    expect(signals.map((signal) => signal.severity)).toEqual(["watch", "alert"]);
  });

  it("describes the move with sign, dimension and the active threshold", () => {
    expect(signals[1]).toMatchObject({ dimension: "macro", pestel: "economic", ruleId: "trm.daily-move.v1" });
    expect(signals[1].title).toContain("bajó");
    expect(signals[0].title).toContain("subió");
    expect(signals[0].ruleText).toContain("1%");
    expect(signals[0].occurredAt).toBe("2026-10-02T00:00:00.000-05:00");
    expect(signals[0].provenance[0].fetchedAt).toBe(FETCHED);
    expect(signals[0].evidence).toEqual([{ kind: "observation", ref: "trm:2026-10-02T00:00:00.000" }]);
  });
});
