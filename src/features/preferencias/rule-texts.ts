import { COMPANY, COMPETITORS, type Thresholds } from "@/content/config/empresa";
import type { PublicContract } from "@/core/domain/contract";
import { detectCompetitorNewContracts } from "@/core/rules/secop-competitor-new-contract";
import { detectExpiringContracts } from "@/core/rules/secop-expiring-contract";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";

export interface RuleText {
  id: string;
  title: string;
  text: string;
}

const PROBE: Omit<PublicContract, "supplierNit" | "supplierName"> = {
  id: "probe",
  entity: "probe",
  value: 0,
  signedAt: "2026-01-01T12:00:00.000-05:00",
  endsAt: "2026-01-01T12:00:00.000-05:00",
  status: "En ejecución",
  provenance: { sourceId: "secop", url: "", fetchedAt: "2026-01-01T12:00:00.000Z", license: "", attribution: "" },
};

/**
 * The rule wording with the active thresholds. It is read from the rules themselves (the text of the
 * signal they build for a throwaway probe contract), so this screen can never drift from them.
 */
export function activeRuleTexts(thresholds: Thresholds): RuleText[] {
  const clock = { now: () => new Date("2026-01-01T17:00:00.000Z") };
  const expiring = detectExpiringContracts({
    contracts: [{ ...PROBE, supplierNit: COMPANY.nit, supplierName: COMPANY.name }],
    companyNit: COMPANY.nit,
    clock,
    thresholds: { watchDays: thresholds.contractExpiryWatchDays, alertDays: thresholds.contractExpiryAlertDays },
  });
  const competitor = COMPETITORS[0];
  const newContract = detectCompetitorNewContracts({
    contracts: [{ ...PROBE, supplierNit: competitor.nit, supplierName: competitor.name }],
    competitors: COMPETITORS,
    clock,
    windowDays: thresholds.competitorContractWindowDays,
  });

  return [
    {
      id: "trm.daily-move.v1",
      title: "Movimiento diario de la TRM",
      text: `${buildTrmDaySignal({ date: "2026-01-01", thresholdPct: thresholds.trmDailyMovePct, fetchedAt: "2026-01-01T00:00:00.000Z" }).ruleText}. Alerta desde ${thresholds.trmDailyAlertPct}%.`,
    },
    { id: "secop.expiring-contract.v1", title: "Contratos por vencer", text: expiring[0]?.ruleText ?? "" },
    { id: "secop.competitor-new-contract.v1", title: "Contratos nuevos de competidores", text: newContract[0]?.ruleText ?? "" },
  ];
}
