import { describe, expect, it } from "vitest";
import type { Signal } from "../domain/signal";
import { dedupeSignals, makeSignalId } from "./dedupe";

const base: Signal = {
  id: "r:a:2026-01-01",
  ruleId: "r",
  ruleText: "t",
  dimension: "procurement",
  pestel: "economic",
  severity: "watch",
  kind: "event",
  title: "x",
  detail: "y",
  occurredAt: "2026-01-01T00:00:00.000Z",
  evidence: [],
  provenance: [],
};

describe("dedupe", () => {
  it("builds a deterministic id", () => {
    expect(makeSignalId("secop.expiring-contract.v1", "CO1.PCCNTR.1", "2026-12-31")).toBe(
      "secop.expiring-contract.v1:CO1.PCCNTR.1:2026-12-31",
    );
  });

  it("keeps one signal per id and prefers the higher severity", () => {
    const result = dedupeSignals([base, { ...base, severity: "alert" }, { ...base, id: "other" }]);
    expect(result.map((signal) => [signal.id, signal.severity])).toEqual([
      ["r:a:2026-01-01", "alert"],
      ["other", "watch"],
    ]);
  });

  it("keeps the first one on equal severity", () => {
    const result = dedupeSignals([
      { ...base, title: "first" },
      { ...base, title: "second" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("first");
  });
});
