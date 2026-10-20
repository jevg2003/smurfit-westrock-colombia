import type { StateStorage } from "zustand/middleware";
import type { Clock } from "@/core/ports/clock";
import type { Signal } from "@/core/domain/signal";

/** In-memory `StateStorage` for tests; `data` is exposed to inspect what was persisted. */
export function createMemoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => void data.set(name, value),
    removeItem: (name) => void data.delete(name),
  };
}

/** Clock that returns a controllable instant. */
export function createFakeClock(start = "2026-10-20T12:00:00.000Z") {
  let current = new Date(start);
  const clock: Clock & { set(iso: string): void } = {
    now: () => new Date(current),
    set: (iso) => {
      current = new Date(iso);
    },
  };
  return clock;
}

export function makeSignal(id: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id,
    ruleId: "test.rule.v1",
    ruleText: "test rule",
    dimension: "market",
    pestel: "economic",
    severity: "watch",
    kind: "event",
    title: `Signal ${id}`,
    detail: "detail",
    occurredAt: "2026-10-19T00:00:00.000Z",
    evidence: [],
    provenance: [],
    ...overrides,
  };
}
