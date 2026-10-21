import { describe, expect, it } from "vitest";
import { clock, makeInputs, THRESHOLDS } from "../usecases/test-data";
import { DEFAULT_SIGNAL_RULES } from "./default-rules";
import { pestelForRule } from "./pestel-mapping";

describe("default rules use the PESTEL mapping", () => {
  const signals = DEFAULT_SIGNAL_RULES.flatMap((rule) => rule(makeInputs(), clock, THRESHOLDS));

  it("produces one signal per rule family", () => {
    const ids = new Set(signals.map((signal) => signal.ruleId));
    expect(ids).toEqual(
      new Set(["trm.daily-move.v1", "secop.expiring-contract.v1", "secop.competitor-new-contract.v1"]),
    );
  });

  it("tags every signal with the mapped factor", () => {
    for (const signal of signals) expect(signal.pestel).toBe(pestelForRule(signal.ruleId));
  });

  it("tags an expiring own contract as political", () => {
    expect(signals.find((signal) => signal.ruleId === "secop.expiring-contract.v1")?.pestel).toBe("political");
  });
});
