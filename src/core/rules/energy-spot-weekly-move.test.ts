import { describe, expect, it } from "vitest";
import type { Observation } from "../domain/observation";
import {
  ENERGY_SPOT_WEEKLY_MOVE_RULE_ID,
  detectEnergySpotWeeklyMoveSignals,
  type EnergySpotThresholds,
} from "./energy-spot-weekly-move";

const THRESHOLDS: EnergySpotThresholds = { energySpotWeeklyMovePct: 15, energySpotWeeklyAlertPct: 30 };
const FETCHED_AT = "2026-10-20T15:00:00.000Z";

const provenance = {
  sourceId: "xm" as const,
  url: "https://servapibi.xm.com.co/hourly",
  fetchedAt: FETCHED_AT,
  license: "Datos públicos de XM",
  attribution: "XM S.A. E.S.P.",
};

/** 14 consecutive days ending 2026-10-17: the first 7 at `previous`, the last 7 at `current`. */
function twoWeeks(previous: number, current: number): Observation[] {
  return Array.from({ length: 14 }, (_, index) => ({
    indicatorId: "precio_bolsa_energia" as const,
    date: `2026-10-${String(4 + index).padStart(2, "0")}`,
    value: index < 7 ? previous : current,
    unit: "COP/kWh",
    provenance,
  }));
}

const run = (observations: Observation[]) =>
  detectEnergySpotWeeklyMoveSignals({ observations, thresholds: THRESHOLDS });

describe("detectEnergySpotWeeklyMoveSignals", () => {
  it("raises nothing just below the watch threshold", () => {
    expect(run(twoWeeks(100, 114.99))).toEqual([]);
  });

  it("raises a watch signal exactly at the threshold", () => {
    const [signal] = run(twoWeeks(100, 115));
    expect(signal).toMatchObject({
      ruleId: ENERGY_SPOT_WEEKLY_MOVE_RULE_ID,
      severity: "watch",
      pestel: "economic",
      dimension: "macro",
      kind: "trend",
      occurredAt: "2026-10-17T00:00:00.000-05:00",
    });
    expect(signal.id).toBe(`${ENERGY_SPOT_WEEKLY_MOVE_RULE_ID}:bolsa:2026-10-17`);
    expect(signal.title).toContain("subió");
    expect(signal.ruleText).toContain("15%");
    expect(signal.evidence).toEqual([{ kind: "observation", ref: "precio_bolsa_energia:2026-10-17" }]);
    expect(signal.provenance).toEqual([provenance]);
  });

  it("stays on watch just below the alert level and alerts exactly at it", () => {
    expect(run(twoWeeks(100, 129.99))[0].severity).toBe("watch");
    expect(run(twoWeeks(100, 130))[0].severity).toBe("alert");
  });

  it("also flags a drop of the same size", () => {
    const [signal] = run(twoWeeks(100, 85));
    expect(signal.title).toContain("bajó");
    expect(signal.severity).toBe("watch");
  });

  it("needs two full contiguous weeks: fewer days or a gap raise nothing", () => {
    expect(run(twoWeeks(100, 200).slice(1))).toEqual([]);
    const gap = twoWeeks(100, 200).filter((obs) => obs.date !== "2026-10-10");
    expect(run(gap)).toEqual([]);
  });

  it("ignores other indicators, unsorted input order and a zero baseline", () => {
    const shuffled = [...twoWeeks(100, 150)].reverse();
    expect(run(shuffled)).toHaveLength(1);
    expect(run(twoWeeks(0, 150))).toEqual([]);
    expect(run(twoWeeks(100, 150).map((obs) => ({ ...obs, indicatorId: "trm" as const })))).toEqual([]);
  });
});
