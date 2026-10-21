import type { IndicatorId } from "../domain/observation";
import type { Signal } from "../domain/signal";
import type { Watchlist } from "../domain/watchlist";

/** What an item is about: a company (by NIT) and/or an indicator. */
export interface WatchSubject {
  nit?: string;
  indicatorId?: IndicatorId;
}

/** Rule-id prefix to the indicator it reads. */
const INDICATOR_BY_RULE_PREFIX: readonly (readonly [string, IndicatorId])[] = [["trm.", "trm"]];

/**
 * The subject of a signal: the supplier NIT of its contract evidence, or the indicator its rule
 * reads. `supplierNitByContractId` maps contract ids to their supplier NIT.
 */
export function signalSubject(signal: Signal, supplierNitByContractId: ReadonlyMap<string, string>): WatchSubject {
  const indicator = INDICATOR_BY_RULE_PREFIX.find(([prefix]) => signal.ruleId.startsWith(prefix));
  if (indicator) return { indicatorId: indicator[1] };

  const contract = signal.evidence.find((evidence) => evidence.kind === "contract");
  const nit = contract ? supplierNitByContractId.get(contract.ref) : undefined;
  return nit ? { nit } : {};
}

export function contractSubject(contract: { supplierNit: string }): WatchSubject {
  return { nit: contract.supplierNit };
}

/** True when the subject is a followed competitor or a followed indicator. */
export function isFollowed(subject: WatchSubject, watchlist: Watchlist): boolean {
  if (subject.nit !== undefined && watchlist.competitorNits.includes(subject.nit)) return true;
  if (subject.indicatorId !== undefined && watchlist.indicators.includes(subject.indicatorId)) return true;
  return false;
}
