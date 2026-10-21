import { describe, expect, it } from "vitest";
import type { Watchlist } from "../domain/watchlist";
import { contractSubject, isFollowed, signalSubject } from "./watch-subject";
import type { Signal } from "../domain/signal";

const makeSignal = (overrides: Partial<Signal>): Signal => ({
  id: "s",
  ruleId: "r",
  ruleText: "t",
  dimension: "macro",
  pestel: "economic",
  severity: "info",
  kind: "event",
  title: "t",
  detail: "d",
  occurredAt: "2026-10-20T00:00:00.000Z",
  evidence: [],
  provenance: [],
  ...overrides,
});

const watch = (competitorNits: string[], indicators: Watchlist["indicators"]): Watchlist => ({ competitorNits, indicators });

describe("signalSubject", () => {
  const nits = new Map([["CO1.1", "860026759"]]);

  it("links a TRM signal to the trm indicator", () => {
    expect(signalSubject(makeSignal({ ruleId: "trm.daily-move.v1" }), nits)).toEqual({ indicatorId: "trm" });
  });

  it("links a contract signal to the supplier NIT of its evidence", () => {
    const signal = makeSignal({ ruleId: "secop.competitor-new-contract.v1", evidence: [{ kind: "contract", ref: "CO1.1" }] });
    expect(signalSubject(signal, nits)).toEqual({ nit: "860026759" });
  });

  it("has no subject when the evidence contract is unknown or the rule is not an indicator", () => {
    const signal = makeSignal({ ruleId: "secop.expiring-contract.v1", evidence: [{ kind: "contract", ref: "other" }] });
    expect(signalSubject(signal, nits)).toEqual({});
  });
});

describe("contractSubject", () => {
  it("is the supplier NIT", () => {
    expect(contractSubject({ supplierNit: "890319047" })).toEqual({ nit: "890319047" });
  });
});

describe("isFollowed", () => {
  it("follows a competitor NIT in the list and an indicator in the list", () => {
    const list = watch(["860026759"], ["trm"]);
    expect(isFollowed({ nit: "860026759" }, list)).toBe(true);
    expect(isFollowed({ indicatorId: "trm" }, list)).toBe(true);
  });

  it("does not follow others, nor a subject-less item", () => {
    const list = watch(["860026759"], ["trm"]);
    expect(isFollowed({ nit: "890319047" }, list)).toBe(false);
    expect(isFollowed({ indicatorId: "pib" }, list)).toBe(false);
    expect(isFollowed({}, list)).toBe(false);
  });

  it("follows nothing with an empty list", () => {
    expect(isFollowed({ nit: "860026759", indicatorId: "trm" }, watch([], []))).toBe(false);
  });
});
