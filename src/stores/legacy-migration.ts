import type { StateStorage } from "zustand/middleware";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";
import type { Clock } from "@/core/ports/clock";
import type { AlertsState } from "./alerts.store";

/** Key used by the TRM-only prototype: a JSON `string[]` of TRM dates. */
export const LEGACY_ALERTS_KEY = "smurfit-trm:alertas";

interface AlertsStoreApi {
  getState(): AlertsState;
}

/**
 * One-time import of the days saved by the prototype. Each date becomes a `reviewed` alert
 * (the user had already saved it on purpose) and the old key is removed. Safe to run repeatedly.
 * The alerts store must already be rehydrated, otherwise hydration would overwrite the import.
 */
export function migrateLegacyAlerts({
  storage,
  alerts,
  clock,
}: {
  storage: StateStorage;
  alerts: AlertsStoreApi;
  clock: Clock;
}): { imported: number } {
  const raw = storage.getItem(LEGACY_ALERTS_KEY);
  if (typeof raw !== "string") return { imported: 0 };

  let dates: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) dates = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Corrupt legacy data is discarded.
  }

  const { createFromSignal, review, alerts: current } = alerts.getState();
  const known = new Set(current.map((alert) => alert.signalId));
  let imported = 0;
  for (const date of dates) {
    const signal = buildTrmDaySignal({ date, fetchedAt: clock.now().toISOString() });
    if (known.has(signal.id)) continue;
    createFromSignal(signal);
    review(signal.id);
    known.add(signal.id);
    imported += 1;
  }

  storage.removeItem(LEGACY_ALERTS_KEY);
  return { imported };
}
