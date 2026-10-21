import { describe, expect, it } from "vitest";
import type { PublicContract } from "../domain/contract";
import { addDaysToKey, bogotaDateKey } from "../time/bogota";
import {
  SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID,
  detectCompetitorNewContracts,
} from "./secop-competitor-new-contract";
import { fixedClock, makeContract } from "./test-fixtures";

const NOW = "2026-10-20T15:00:00.000Z";
const TODAY = bogotaDateKey(new Date(NOW));
const COMPETITORS = [
  { nit: "860026759", name: "Cartones América" },
  { nit: "890925108", name: "Papeles y Cartones" },
];

function signedAgo(days: number, overrides: Partial<PublicContract> = {}) {
  return makeContract({
    id: `C${days}`,
    supplierNit: "860026759",
    supplierName: "CARTONES AMERICA S.A.",
    signedAt: `${addDaysToKey(TODAY, -days)}T00:00:00.000-05:00`,
    ...overrides,
  });
}

const run = (contracts: PublicContract[], windowDays = 30) =>
  detectCompetitorNewContracts({ contracts, competitors: COMPETITORS, clock: fixedClock(NOW), windowDays });

describe("secop.competitor-new-contract.v1", () => {
  it("signals a competitor contract signed today and exactly 30 days ago", () => {
    expect(run([signedAgo(0)])).toHaveLength(1);
    expect(run([signedAgo(30)])).toHaveLength(1);
  });

  it("ignores contracts signed 31 days ago or in the future", () => {
    expect(run([signedAgo(31)])).toEqual([]);
    expect(run([signedAgo(-1)])).toEqual([]);
  });

  it("ignores suppliers that are not configured competitors (including the company)", () => {
    expect(run([signedAgo(5, { supplierNit: "890300406" })])).toEqual([]);
    expect(run([signedAgo(5, { supplierNit: "999999999" })])).toEqual([]);
  });

  it("builds a watch signal in the competitors dimension with evidence and provenance", () => {
    const [signal] = run([signedAgo(5)]);
    expect(signal).toMatchObject({
      ruleId: SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID,
      dimension: "competitors",
      severity: "watch",
      pestel: "economic",
    });
    expect(signal.id).toBe(`${SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID}:C5:${addDaysToKey(TODAY, -5)}`);
    expect(signal.title).toContain("Cartones América");
    expect(signal.ruleText).toContain("30 días");
    expect(signal.evidence).toEqual([{ kind: "contract", ref: "C5" }]);
    expect(signal.occurredAt).toBe(`${addDaysToKey(TODAY, -5)}T00:00:00.000-05:00`);
  });

  it("follows a custom window", () => {
    expect(run([signedAgo(10)], 7)).toEqual([]);
    expect(run([signedAgo(7)], 7)).toHaveLength(1);
    expect(run([signedAgo(7)], 7)[0].ruleText).toContain("7 días");
  });
});
