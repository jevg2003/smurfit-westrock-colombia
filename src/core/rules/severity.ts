import type { Severity } from "../domain/dimension";

const RANK: Record<Severity, number> = { info: 0, watch: 1, alert: 2 };

/** Positive when `a` is more severe than `b`. */
export function compareSeverity(a: Severity, b: Severity): number {
  return RANK[a] - RANK[b];
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return compareSeverity(a, b) >= 0 ? a : b;
}
