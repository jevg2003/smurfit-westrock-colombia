import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { Alert } from "@/core/domain/alert";
import type { Result } from "@/core/domain/result";
import type { Signal } from "@/core/domain/signal";
import type { Clock } from "@/core/ports/clock";
import { browserStorage } from "./browser-storage";
import { systemClock } from "./system-clock";

export const ALERTS_STORAGE_KEY = "swc:alerts:v1";
export const MAX_ALERTS = 500;

export interface AlertError {
  kind: "not_found" | "note_required" | "invalid_transition";
  message: string;
}

export interface AlertsState {
  alerts: Alert[];
  /** Creates a `new` alert from a signal snapshot, or returns the existing one for that signal. */
  createFromSignal(signal: Signal): Alert;
  review(signalId: string, note?: string): Result<Alert, AlertError>;
  /** Dismissing requires a non-empty note. */
  dismiss(signalId: string, note?: string): Result<Alert, AlertError>;
  remove(signalId: string): void;
}

const ALLOWED_TARGETS: Record<Alert["state"], Alert["state"][]> = {
  new: ["reviewed", "dismissed"],
  reviewed: ["dismissed"],
  dismissed: [],
};

export interface AlertsStoreOptions {
  storage?: StateStorage;
  clock?: Clock;
}

export function createAlertsStore({ storage, clock = systemClock }: AlertsStoreOptions = {}) {
  return create<AlertsState>()(
    persist(
      (set, get) => {
        const transition = (signalId: string, target: Alert["state"], note: string | undefined) => {
          const current = get().alerts.find((alert) => alert.signalId === signalId);
          if (!current) return fail("not_found", "No existe una alerta para esa señal.");
          if (!ALLOWED_TARGETS[current.state].includes(target)) {
            return fail("invalid_transition", `No se puede pasar de ${current.state} a ${target}.`);
          }
          const trimmed = note?.trim();
          const updated: Alert = {
            ...current,
            state: target,
            updatedAt: clock.now().toISOString(),
            ...(trimmed ? { note: trimmed } : {}),
          };
          set({ alerts: get().alerts.map((alert) => (alert.signalId === signalId ? updated : alert)) });
          return { ok: true, value: updated } as const;
        };

        return {
          alerts: [],
          createFromSignal: (signal) => {
            const existing = get().alerts.find((alert) => alert.signalId === signal.id);
            if (existing) return existing;
            const now = clock.now().toISOString();
            const alert: Alert = {
              signalId: signal.id,
              state: "new",
              createdAt: now,
              updatedAt: now,
              signalSnapshot: signal,
            };
            set({ alerts: [...get().alerts, alert].slice(-MAX_ALERTS) });
            return alert;
          },
          review: (signalId, note) => transition(signalId, "reviewed", note),
          dismiss: (signalId, note) =>
            note?.trim()
              ? transition(signalId, "dismissed", note)
              : fail("note_required", "Escribe una nota para descartar la alerta."),
          remove: (signalId) => set({ alerts: get().alerts.filter((alert) => alert.signalId !== signalId) }),
        };
      },
      {
        name: ALERTS_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({ alerts: state.alerts }),
      },
    ),
  );
}

function fail(kind: AlertError["kind"], message: string) {
  return { ok: false, error: { kind, message } } as const;
}

export const useAlertsStore = createAlertsStore();
