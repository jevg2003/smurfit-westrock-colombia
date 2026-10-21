import type { Alert } from "@/core/domain/alert";
import type { Result } from "@/core/domain/result";
import type { Signal } from "@/core/domain/signal";
import { type AlertError, useAlertsStore } from "@/stores/alerts.store";

/** The store alert of a signal, created as `new` when it is not there yet. */
export function ensureAlert(signal: Signal): Alert {
  return useAlertsStore.getState().createFromSignal(signal);
}

export function reviewSignal(signal: Signal, note?: string): Result<Alert, AlertError> {
  ensureAlert(signal);
  return useAlertsStore.getState().review(signal.id, note);
}

/** A note is required; the store answers `note_required` otherwise. */
export function dismissSignal(signal: Signal, note: string): Result<Alert, AlertError> {
  ensureAlert(signal);
  return useAlertsStore.getState().dismiss(signal.id, note);
}
