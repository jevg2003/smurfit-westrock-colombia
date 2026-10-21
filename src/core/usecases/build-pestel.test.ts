import { describe, expect, it } from "vitest";
import { buildPestel, PESTEL_ORDER, type PestelPeriod } from "./build-pestel";
import { makeBriefingSignal } from "./test-data";

// Period: 2026-10-12 .. 2026-10-18 Bogota (7 days). Previous: 2026-10-05 .. 2026-10-11.
const PERIOD: PestelPeriod = { from: "2026-10-12T05:00:00.000Z", to: "2026-10-19T04:59:59.999Z" };

const at = (iso: string, id: string, overrides = {}) => makeBriefingSignal(id, iso, overrides);
const factor = (list: ReturnType<typeof buildPestel>, key: string) => list.find((item) => item.pestel === key)!;

describe("buildPestel", () => {
  it("returns the six factors in fixed order, even when empty", () => {
    const result = buildPestel([], PERIOD);
    expect(result.map((item) => item.pestel)).toEqual([...PESTEL_ORDER]);
    for (const item of result) {
      expect(item.total).toBe(0);
      expect(item.bySeverity).toEqual({ info: 0, watch: 0, alert: 0 });
      expect(item.top).toEqual([]);
      expect(item.trend.direction).toBe("flat");
    }
  });

  it("counts by severity only inside the period, both ends included", () => {
    const signals = [
      at("2026-10-12T05:00:00.000Z", "start", { severity: "alert" }),
      at("2026-10-19T04:59:59.999Z", "end", { severity: "watch" }),
      at("2026-10-12T04:59:59.999Z", "before", { severity: "alert", pestel: "economic" }),
      at("2026-10-19T05:00:00.000Z", "after", { severity: "alert" }),
    ];
    const economic = factor(buildPestel(signals, PERIOD), "economic");
    expect(economic.total).toBe(2);
    expect(economic.bySeverity).toEqual({ info: 0, watch: 1, alert: 1 });
  });

  it("keeps the three most severe, newest first, as top signals", () => {
    const signals = [
      at("2026-10-13T15:00:00.000Z", "w1", { severity: "watch" }),
      at("2026-10-14T15:00:00.000Z", "w2", { severity: "watch" }),
      at("2026-10-12T15:00:00.000Z", "a1", { severity: "alert" }),
      at("2026-10-15T15:00:00.000Z", "i1", { severity: "info" }),
    ];
    const top = factor(buildPestel(signals, PERIOD), "economic").top.map((signal) => signal.id);
    expect(top).toEqual(["a1", "w2", "w1"]);
  });

  it("compares counts against the previous period of equal length", () => {
    const signals = [
      at("2026-10-13T15:00:00.000Z", "now1"),
      at("2026-10-14T15:00:00.000Z", "now2"),
      at("2026-10-06T15:00:00.000Z", "prev1"),
    ];
    const trend = factor(buildPestel(signals, PERIOD), "economic").trend;
    expect(trend).toMatchObject({ direction: "up", current: 2, previous: 1 });
    expect(trend.label).toMatch(/comparación de conteos/i);
    expect(trend.label).toMatch(/no es un pronóstico/i);
  });

  it("reports down and flat trends", () => {
    const down = [at("2026-10-06T15:00:00.000Z", "p1"), at("2026-10-07T15:00:00.000Z", "p2")];
    expect(factor(buildPestel(down, PERIOD), "economic").trend.direction).toBe("down");
    const flat = [at("2026-10-13T15:00:00.000Z", "n1"), at("2026-10-06T15:00:00.000Z", "p1")];
    expect(factor(buildPestel(flat, PERIOD), "economic").trend.direction).toBe("flat");
  });

  it("puts the previous period boundary exactly before the current one", () => {
    const signals = [
      at("2026-10-05T05:00:00.000Z", "prevStart"),
      at("2026-10-12T04:59:59.999Z", "prevEnd"),
      at("2026-10-05T04:59:59.999Z", "tooOld"),
    ];
    expect(factor(buildPestel(signals, PERIOD), "economic").trend.previous).toBe(2);
  });

  it("groups by the signal factor and counts impact by rule table", () => {
    const signals = [
      at("2026-10-13T15:00:00.000Z", "c", { ruleId: "secop.competitor-new-contract.v1", pestel: "economic" }),
      at("2026-10-13T16:00:00.000Z", "t", { ruleId: "trm.daily-move.v1", pestel: "economic" }),
      at("2026-10-13T17:00:00.000Z", "e", { ruleId: "secop.expiring-contract.v1", pestel: "political" }),
    ];
    const result = buildPestel(signals, PERIOD);
    expect(factor(result, "economic").impacts).toEqual({ opportunity: 0, threat: 1, to_evaluate: 1 });
    expect(factor(result, "political").impacts).toEqual({ opportunity: 0, threat: 0, to_evaluate: 1 });
    expect(factor(result, "legal").total).toBe(0);
  });
});
