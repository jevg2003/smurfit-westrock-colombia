import type { PublicContract } from "../domain/contract";
import type { Signal } from "../domain/signal";
import type { Clock } from "../ports/clock";
import { bogotaDateKey, daysUntil } from "../time/bogota";
import { makeSignalId } from "./dedupe";
import { daysLabel, formatCop } from "./format";
import { pestelForRule } from "./pestel-mapping";

export const SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID = "secop.competitor-new-contract.v1";

export interface CompetitorRef {
  nit: string;
  name: string;
}

export interface CompetitorNewContractInput {
  contracts: readonly PublicContract[];
  competitors: readonly CompetitorRef[];
  clock: Clock;
  /** A contract counts as new when signed at most this many days ago. */
  windowDays: number;
}

/**
 * A configured competitor signed a contract in the last `windowDays` Bogota calendar days
 * (today and exactly `windowDays` days ago both count; future dates do not). Severity is `watch`.
 */
export function detectCompetitorNewContracts({
  contracts,
  competitors,
  clock,
  windowDays,
}: CompetitorNewContractInput): Signal[] {
  const now = clock.now();
  const byNit = new Map(competitors.map((competitor) => [competitor.nit, competitor.name]));
  const ruleText = `Un competidor configurado firma un contrato nuevo (firmado en los últimos ${daysLabel(windowDays)})`;

  return contracts.flatMap((contract): Signal[] => {
    const competitorName = byNit.get(contract.supplierNit);
    if (!competitorName) return [];
    const ago = -daysUntil(contract.signedAt, now);
    if (ago < 0 || ago > windowDays) return [];

    return [
      {
        id: makeSignalId(SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID, contract.id, bogotaDateKey(contract.signedAt)),
        ruleId: SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID,
        ruleText,
        dimension: "competitors",
        pestel: pestelForRule(SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID),
        severity: "watch",
        kind: "event",
        title: `${competitorName} firmó un contrato con ${contract.entity}`,
        detail: `${formatCop(contract.value)}, firmado el ${bogotaDateKey(contract.signedAt)}. Estado: ${contract.status}.`,
        occurredAt: contract.signedAt,
        evidence: [{ kind: "contract", ref: contract.id }],
        provenance: [contract.provenance],
      },
    ];
  });
}
