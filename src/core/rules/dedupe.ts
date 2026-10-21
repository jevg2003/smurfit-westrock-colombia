import type { Signal } from "../domain/signal";
import { compareSeverity } from "./severity";

/** Deterministic signal id: `${ruleId}:${subject}:${date}`. */
export function makeSignalId(ruleId: string, subject: string, date: string): string {
  return `${ruleId}:${subject}:${date}`;
}

/**
 * Keeps one signal per id. On a collision the more severe one wins; on a tie the first one stays.
 * The order of first appearance is preserved.
 */
export function dedupeSignals(signals: readonly Signal[]): Signal[] {
  const byId = new Map<string, Signal>();
  for (const signal of signals) {
    const current = byId.get(signal.id);
    if (!current || compareSeverity(signal.severity, current.severity) > 0) byId.set(signal.id, signal);
  }
  return [...byId.values()];
}
