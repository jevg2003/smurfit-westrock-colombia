import { buildTrmDaySignal, trmDaySignalId } from "@/core/rules/trm-daily-move";
import type { Clock } from "@/core/ports/clock";
import type { AlertsState } from "@/stores/alerts.store";

interface AlertsStoreApi {
  getState(): AlertsState;
}

/**
 * Toggles a TRM day between saved and not saved.
 * - Saved (new or reviewed) -> un-save: the alert is removed.
 * - Not saved -> save: a `reviewed` alert is created, because the user chose it on purpose.
 * - Dismissed -> save again: the dismissed alert is replaced by a fresh `reviewed` one.
 */
export function toggleSavedDay(store: AlertsStoreApi, date: string, clock: Clock): void {
  const { alerts, createFromSignal, review, remove } = store.getState();
  const signalId = trmDaySignalId(date);
  const existing = alerts.find((alert) => alert.signalId === signalId);

  if (existing) {
    remove(signalId);
    if (existing.state !== "dismissed") return;
  }

  createFromSignal(buildTrmDaySignal({ date, fetchedAt: clock.now().toISOString() }));
  review(signalId);
}
