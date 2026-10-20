"use client";

import { useEffect } from "react";
import { useAlertsStore } from "./alerts.store";
import { migrateLegacyAlerts } from "./legacy-migration";
import { usePreferencesStore } from "./preferences.store";
import { systemClock } from "./system-clock";
import { useWatchlistStore } from "./watchlist.store";

/** Rehydrates the persisted stores after mount (they use `skipHydration`) and runs the legacy import. */
export function StoreHydrator() {
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      useAlertsStore.persist.rehydrate(),
      useWatchlistStore.persist.rehydrate(),
      usePreferencesStore.persist.rehydrate(),
    ]).then(() => {
      if (cancelled) return;
      migrateLegacyAlerts({ storage: window.localStorage, alerts: useAlertsStore, clock: systemClock });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
