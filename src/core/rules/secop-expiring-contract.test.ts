import { describe, expect, it } from "vitest";
import type { PublicContract } from "../domain/contract";
import { addDaysToKey, bogotaDateKey } from "../time/bogota";
import { SECOP_EXPIRING_CONTRACT_RULE_ID, detectExpiringContracts } from "./secop-expiring-contract";
import { fixedClock, makeContract } from "./test-fixtures";

const NOW = "2026-10-20T15:00:00.000Z"; // 2026-10-20 in Bogota
const thresholds = { watchDays: 90, alertDays: 30 };
const TODAY = bogotaDateKey(new Date(NOW));

function endingIn(days: number, overrides: Partial<PublicContract> = {}) {
  return makeContract({ endsAt: `${addDaysToKey(TODAY, days)}T00:00:00.000-05:00`, ...overrides });
}

const run = (contracts: PublicContract[], clockIso = NOW, t = thresholds) =>
  detectExpiringContracts({ contracts, companyNit: "890300406", clock: fixedClock(clockIso), thresholds: t });

describe("secop.expiring-contract.v1", () => {
  it("raises a watch signal at exactly 90 days", () => {
    const [signal] = run([endingIn(90)]);
    expect(signal.severity).toBe("watch");
    expect(signal.ruleId).toBe(SECOP_EXPIRING_CONTRACT_RULE_ID);
  });

  it("raises nothing at 91 days", () => {
    expect(run([endingIn(91)])).toEqual([]);
  });

  it("stays on watch at 31 days and becomes an alert at exactly 30", () => {
    expect(run([endingIn(31)])[0].severity).toBe("watch");
    expect(run([endingIn(30)])[0].severity).toBe("alert");
  });

  it("still alerts on the last day (0 days) and ignores contracts that already ended", () => {
    expect(run([endingIn(0)])[0].severity).toBe("alert");
    expect(run([endingIn(-1)])).toEqual([]);
  });

  it("ignores contracts without an end date, other suppliers and finished ones", () => {
    expect(run([makeContract({ endsAt: undefined })])).toEqual([]);
    expect(run([endingIn(10, { supplierNit: "860026759" })])).toEqual([]);
    expect(run([endingIn(10, { status: "Terminado" })])).toEqual([]);
  });

  it("shows the worked example: 2026-12-31 seen on 2026-10-20 is 72 days away", () => {
    const [signal] = run([makeContract()]);
    expect(signal.title).toBe("Contrato con INDUSTRIA LICORERA DEL CAUCA vence en 72 días");
    expect(signal.severity).toBe("watch");
    expect(signal.ruleText).toContain("fin ≤ 90 días");
    expect(signal.evidence).toEqual([{ kind: "contract", ref: "CO1.PCCNTR.1" }]);
    expect(signal.provenance[0].license).toBe("CC BY-SA 4.0");
    expect(signal.dimension).toBe("procurement");
  });

  it("uses the Bogota calendar day, not the UTC day", () => {
    // A contract ending in 90 Bogota days from 2026-10-20.
    const contract = endingIn(90);
    // 2026-10-21T04:59Z is still 2026-10-20 in Bogota: 90 days, in range.
    expect(run([contract], "2026-10-21T04:59:59.000Z")).toHaveLength(1);
    // 2026-10-21T05:00Z is 2026-10-21 in Bogota: 89 days, still in range.
    expect(run([contract], "2026-10-21T05:00:00.000Z")).toHaveLength(1);
    // 2026-10-20T04:59Z is still 2026-10-19 in Bogota: 91 days, out of range.
    expect(run([contract], "2026-10-20T04:59:59.000Z")).toHaveLength(0);
    expect(run([contract], "2026-10-20T05:00:00.000Z")).toHaveLength(1);
  });

  it("follows custom thresholds and shows them in the rule text", () => {
    const custom = { watchDays: 45, alertDays: 20 };
    const [signal] = run([endingIn(40)], NOW, custom);
    expect(signal.severity).toBe("watch");
    expect(signal.ruleText).toContain("fin ≤ 45 días");
    expect(signal.ruleText).toContain("fin ≤ 20 días");
    expect(run([endingIn(50)], NOW, custom)).toEqual([]);
  });

  it("gives a new id when the severity escalates", () => {
    const watch = run([endingIn(60)])[0];
    const escalated = run([makeContract({ endsAt: endingIn(60).endsAt })], "2026-12-01T15:00:00.000Z")[0];
    expect(watch.severity).toBe("watch");
    expect(escalated.severity).toBe("alert");
    expect(watch.id).not.toBe(escalated.id);
  });
});
