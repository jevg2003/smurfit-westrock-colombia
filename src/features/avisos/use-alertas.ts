"use client";

import { useCallback, useMemo } from "react";
import { trmDaySignalId } from "@/core/rules/trm-daily-move";
import { useAlertsStore } from "@/stores/alerts.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { systemClock } from "@/stores/system-clock";
import { toggleSavedDay } from "./toggle-saved-day";

const TRM_SIGNAL_PREFIX = trmDaySignalId("");

/**
 * Saved TRM days, backed by the alerts store. A saved day is a `reviewed` alert on the
 * `trm.daily-move.v1` signal of that day; un-saving removes the alert (see `toggleSavedDay`).
 * `hasHydrated` is false until the persisted store is loaded, so views can avoid an empty-state flash.
 */
export function useAlertas() {
  const alerts = useAlertsStore((state) => state.alerts);
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);

  const ids = useMemo(
    () =>
      alerts
        .filter((alert) => alert.state !== "dismissed" && alert.signalId.startsWith(TRM_SIGNAL_PREFIX))
        .map((alert) => alert.signalId.slice(TRM_SIGNAL_PREFIX.length)),
    [alerts],
  );

  const alternar = useCallback((id: string) => toggleSavedDay(useAlertsStore, id, systemClock), []);

  const estaGuardado = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, alternar, estaGuardado, hasHydrated };
}
