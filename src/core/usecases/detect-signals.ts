import type { PublicContract } from "../domain/contract";
import type { NewsItem } from "../domain/news";
import type { Signal } from "../domain/signal";
import type { Clock } from "../ports/clock";
import type { TermGroup } from "../text/match";
import { dedupeSignals } from "../rules/dedupe";
import type { CompetitorRef } from "../rules/secop-competitor-new-contract";
import { compareSeverity } from "../rules/severity";
import type { RuleThresholds } from "../rules/thresholds";
import type { TrmInputRecord } from "../rules/trm-daily-move";

export interface SignalInputs {
  contracts: readonly PublicContract[];
  trmRecords: readonly TrmInputRecord[];
  /** ISO 8601 UTC instant at which the TRM data was read. */
  trmFetchedAt: string;
  companyNit: string;
  competitors: readonly CompetitorRef[];
  /** Headlines (media RSS and Google News). Absent when the source is off or failed. */
  news?: readonly NewsItem[];
  /** The news term groups of the preferences, with their current terms. */
  newsTermGroups?: readonly TermGroup[];
}

/** A rule adapted to the shared inputs. Pure: no I/O, time only through the clock. */
export type SignalRule = (inputs: SignalInputs, clock: Clock, thresholds: RuleThresholds) => Signal[];

/** Most severe first, then newest first, then by id so the order is stable. */
export function compareSignals(a: Signal, b: Signal): number {
  return (
    compareSeverity(b.severity, a.severity) ||
    Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
    a.id.localeCompare(b.id)
  );
}

/** Runs every rule, removes duplicate ids and sorts the result. */
export function detectSignals(
  inputs: SignalInputs,
  rules: readonly SignalRule[],
  clock: Clock,
  thresholds: RuleThresholds,
): Signal[] {
  const all = rules.flatMap((rule) => rule(inputs, clock, thresholds));
  return dedupeSignals(all).sort(compareSignals);
}
