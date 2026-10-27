import type { Alert } from "../domain/alert";
import type { Signal } from "../domain/signal";
import { fixedClock, makeContract } from "../rules/test-fixtures";
import type { SignalInputs } from "./detect-signals";

export const NOW = "2026-10-20T15:00:00.000Z"; // Tuesday 2026-10-20 in Bogota
export const clock = fixedClock(NOW);

export const COMPETITORS = [
  { nit: "900000002", name: "Competidora Uno" },
  { nit: "900000004", name: "Competidora Tres" },
];

export const THRESHOLDS = {
  trmDailyMovePct: 1,
  trmDailyAlertPct: 2,
  contractExpiryWatchDays: 90,
  contractExpiryAlertDays: 30,
  competitorContractWindowDays: 30,
  energySpotWeeklyMovePct: 15,
  energySpotWeeklyAlertPct: 30,
};

export function makeInputs(overrides: Partial<SignalInputs> = {}): SignalInputs {
  return {
    contracts: [
      makeContract(), // ends 2026-12-31: 72 days, watch
      makeContract({
        id: "CO1.PCCNTR.COMP",
        supplierNit: "900000002",
        supplierName: "COMPETIDORA UNO S.A.",
        entity: "FABRICA DE LICORES DEL TOLIMA",
        signedAt: "2026-10-10T00:00:00.000-05:00",
        endsAt: "2027-12-31T00:00:00.000-05:00",
      }),
    ],
    trmRecords: [
      { validFrom: "2026-10-18T00:00:00.000", value: "4000" },
      { validFrom: "2026-10-19T00:00:00.000", value: "3900" }, // -2.5 %: alert
    ],
    trmFetchedAt: NOW,
    companyNit: "900000001",
    competitors: COMPETITORS,
    ...overrides,
  };
}

export function makeBriefingSignal(id: string, occurredAt: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id,
    ruleId: "test.rule.v1",
    ruleText: "regla de prueba",
    dimension: "procurement",
    pestel: "economic",
    severity: "watch",
    kind: "event",
    title: `Señal ${id}`,
    detail: "Detalle",
    occurredAt,
    evidence: [],
    provenance: [
      {
        sourceId: "secop",
        url: "https://example.test/record",
        fetchedAt: NOW,
        license: "CC BY-SA 4.0",
        attribution: "Fuente de prueba",
      },
    ],
    ...overrides,
  };
}

export function makeAlert(signal: Signal, overrides: Partial<Alert> = {}): Alert {
  return {
    signalId: signal.id,
    state: "new",
    createdAt: signal.occurredAt,
    updatedAt: signal.occurredAt,
    signalSnapshot: signal,
    ...overrides,
  };
}
