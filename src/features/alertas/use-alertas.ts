"use client";

import { useCallback, useMemo } from "react";
import { buildTrmDaySignal, trmDaySignalId } from "@/core/rules/trm-daily-move";
import { useAlertsStore } from "@/stores/alerts.store";
import { systemClock } from "@/stores/system-clock";

const TRM_SIGNAL_PREFIX = trmDaySignalId("");

/**
 * Saved TRM days, backed by the alerts store. A saved day is a `reviewed` alert on the
 * `trm.daily-move.v1` signal of that day; un-saving removes the alert.
 */
export function useAlertas() {
  const alerts = useAlertsStore((state) => state.alerts);

  const ids = useMemo(
    () =>
      alerts
        .filter((alert) => alert.state !== "dismissed" && alert.signalId.startsWith(TRM_SIGNAL_PREFIX))
        .map((alert) => alert.signalId.slice(TRM_SIGNAL_PREFIX.length)),
    [alerts],
  );

  const alternar = useCallback((id: string) => {
    const { alerts: current, createFromSignal, review, remove } = useAlertsStore.getState();
    const signalId = trmDaySignalId(id);
    const existing = current.find((alert) => alert.signalId === signalId);
    if (existing) remove(signalId);
    if (existing && existing.state !== "dismissed") return; // un-save; a dismissed day is saved again
    createFromSignal(buildTrmDaySignal({ date: id, fetchedAt: systemClock.now().toISOString() }));
    review(signalId);
  }, []);

  const estaGuardado = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, alternar, estaGuardado };
}
