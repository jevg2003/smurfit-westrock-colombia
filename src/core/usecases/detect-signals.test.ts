import { describe, expect, it } from "vitest";
import type { Observation } from "../domain/observation";
import { DEFAULT_SIGNAL_RULES } from "../rules/default-rules";
import { detectSignals, type SignalRule } from "./detect-signals";
import { THRESHOLDS, clock, makeBriefingSignal, makeInputs } from "./test-data";

describe("detectSignals", () => {
  it("runs every rule and sorts by severity, then newest first", () => {
    const signals = detectSignals(makeInputs(), DEFAULT_SIGNAL_RULES, clock, THRESHOLDS);
    expect(signals.map((signal) => [signal.ruleId, signal.severity])).toEqual([
      ["trm.daily-move.v1", "alert"],
      ["secop.competitor-new-contract.v1", "watch"],
      ["secop.expiring-contract.v1", "watch"],
    ]);
  });

  it("is deterministic: the same inputs give the same ids", () => {
    const first = detectSignals(makeInputs(), DEFAULT_SIGNAL_RULES, clock, THRESHOLDS).map((signal) => signal.id);
    const second = detectSignals(makeInputs(), DEFAULT_SIGNAL_RULES, clock, THRESHOLDS).map((signal) => signal.id);
    expect(second).toEqual(first);
  });

  it("removes duplicates produced by different rules or repeated inputs", () => {
    const duplicate: SignalRule = () => [makeBriefingSignal("dup", "2026-10-01T05:00:00.000Z")];
    const signals = detectSignals(makeInputs(), [duplicate, duplicate], clock, THRESHOLDS);
    expect(signals).toHaveLength(1);
  });

  it("passes the thresholds to the rules", () => {
    const strict = { ...THRESHOLDS, contractExpiryWatchDays: 10, trmDailyMovePct: 5, trmDailyAlertPct: 10 };
    const signals = detectSignals(makeInputs(), DEFAULT_SIGNAL_RULES, clock, strict);
    expect(signals.map((signal) => signal.ruleId)).toEqual(["secop.competitor-new-contract.v1"]);
  });

  it("runs the energy spot rule on the XM observations with the preference thresholds", () => {
    const provenance = { sourceId: "xm" as const, url: "u", fetchedAt: "2026-10-20T15:00:00.000Z", license: "l", attribution: "XM" };
    const energySpot: Observation[] = Array.from({ length: 14 }, (_, index) => ({
      indicatorId: "precio_bolsa_energia" as const,
      date: `2026-10-${String(4 + index).padStart(2, "0")}`,
      value: index < 7 ? 100 : 140,
      unit: "COP/kWh",
      provenance,
    }));
    const inputs = makeInputs({ contracts: [], trmRecords: [], energySpot });
    const signals = detectSignals(inputs, DEFAULT_SIGNAL_RULES, clock, THRESHOLDS);
    expect(signals.map((signal) => [signal.ruleId, signal.severity, signal.pestel])).toEqual([["energy.spot-weekly-move.v1", "alert", "economic"]]);

    const lenient = { ...THRESHOLDS, energySpotWeeklyMovePct: 50, energySpotWeeklyAlertPct: 80 };
    expect(detectSignals(inputs, DEFAULT_SIGNAL_RULES, clock, lenient)).toEqual([]);
  });

  it("returns an empty list when there is nothing to report", () => {
    const inputs = makeInputs({ contracts: [], trmRecords: [] });
    expect(detectSignals(inputs, DEFAULT_SIGNAL_RULES, clock, THRESHOLDS)).toEqual([]);
  });
});
