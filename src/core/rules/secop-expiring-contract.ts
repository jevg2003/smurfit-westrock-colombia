import type { PublicContract } from "../domain/contract";
import type { Signal } from "../domain/signal";
import type { Clock } from "../ports/clock";
import { addDaysToKey, bogotaDateKey, bogotaStartOfDay, daysUntil } from "../time/bogota";
import { makeSignalId } from "./dedupe";
import { daysLabel, formatCop } from "./format";
import { pestelForRule } from "./pestel-mapping";

export const SECOP_EXPIRING_CONTRACT_RULE_ID = "secop.expiring-contract.v1";

export interface ExpiryThresholds {
  /** From this many days before the end, the contract is on watch. */
  watchDays: number;
  /** From this many days before the end, the contract raises an alert. */
  alertDays: number;
}

export interface ExpiringContractInput {
  contracts: readonly PublicContract[];
  /** NIT of the company whose contracts are watched. */
  companyNit: string;
  clock: Clock;
  thresholds: ExpiryThresholds;
}

const FINISHED_STATUS = /^terminad[oa]$/i;

/**
 * Company contracts that end within `watchDays` (watch) or `alertDays` (alert) and are not finished.
 * A contract that already ended, or has no end date, raises nothing. The last day counts as 0 days.
 * Days are Bogota calendar days. The signal date is the day the contract entered its current
 * window, so an escalation from watch to alert is a new signal.
 */
export function detectExpiringContracts({
  contracts,
  companyNit,
  clock,
  thresholds,
}: ExpiringContractInput): Signal[] {
  const now = clock.now();
  const ruleText = `Contrato de la empresa con fin ≤ ${daysLabel(thresholds.watchDays)} (vigilar) o fin ≤ ${daysLabel(thresholds.alertDays)} (alerta), y estado distinto de terminado`;

  return contracts.flatMap((contract): Signal[] => {
    if (contract.supplierNit !== companyNit || !contract.endsAt) return [];
    if (FINISHED_STATUS.test(contract.status.trim())) return [];

    const days = daysUntil(contract.endsAt, now);
    if (days < 0 || days > thresholds.watchDays) return [];

    const severity = days <= thresholds.alertDays ? "alert" : "watch";
    const windowDays = severity === "alert" ? thresholds.alertDays : thresholds.watchDays;
    const endKey = bogotaDateKey(contract.endsAt);
    const enteredKey = addDaysToKey(endKey, -windowDays);
    const remaining = days === 0 ? "vence hoy" : `vence en ${daysLabel(days)}`;

    return [
      {
        id: makeSignalId(SECOP_EXPIRING_CONTRACT_RULE_ID, contract.id, enteredKey),
        ruleId: SECOP_EXPIRING_CONTRACT_RULE_ID,
        ruleText,
        dimension: "procurement",
        pestel: pestelForRule(SECOP_EXPIRING_CONTRACT_RULE_ID),
        severity,
        kind: "event",
        title: `Contrato con ${contract.entity} ${remaining}`,
        detail: `${formatCop(contract.value)}, termina el ${endKey}. Estado: ${contract.status}.`,
        occurredAt: bogotaStartOfDay(enteredKey).toISOString(),
        evidence: [{ kind: "contract", ref: contract.id }],
        provenance: [contract.provenance],
      },
    ];
  });
}
