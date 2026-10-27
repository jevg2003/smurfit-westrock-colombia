import { notifyUndo } from "@/components/events/undo-notice";
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

/** Puts a previous copy of an alert back. Review and dismissal never delete, so this is the only way back. */
function restore(previous: Alert) {
  useAlertsStore.setState((state) => ({
    alerts: state.alerts.map((alert) => (alert.signalId === previous.signalId ? previous : alert)),
  }));
}

/** Reviews a signal and offers to undo it for a few seconds. */
export function reviewWithUndo(signal: Signal, note?: string): Result<Alert, AlertError> {
  const previous = ensureAlert(signal);
  const result = reviewSignal(signal, note);
  if (result.ok) notifyUndo("Revisado.", () => restore(previous));
  return result;
}

/** Dismisses a signal with its note and offers to undo it for a few seconds. */
export function dismissWithUndo(signal: Signal, note: string): Result<Alert, AlertError> {
  const previous = ensureAlert(signal);
  const result = dismissSignal(signal, note);
  if (result.ok) notifyUndo("Descartado.", () => restore(previous));
  return result;
}

/** Returns a reviewed signal to pending ("new"). The store only moves forward, so this writes the state directly. */
export function reopenWithUndo(signal: Signal): void {
  const previous = ensureAlert(signal);
  if (previous.state !== "reviewed") return;
  restore({ ...previous, state: "new", updatedAt: new Date().toISOString() });
  notifyUndo("Marcado como pendiente.", () => restore(previous));
}
