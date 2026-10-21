"use client";

import { useEffect } from "react";
import { consoleLogger } from "@/infrastructure/logging/console-logger";
import { useAlertsStore } from "./alerts.store";
import { useDecisionsStore } from "./decisions.store";
import { hydrateStores } from "./hydrate-stores";
import { useHydrationStore } from "./hydration.store";
import { migrateLegacyAlerts } from "./legacy-migration";
import { usePreferencesStore } from "./preferences.store";
import { systemClock } from "./system-clock";
import { useWatchlistStore } from "./watchlist.store";

/**
 * Rehydrates the persisted stores after mount (they use `skipHydration`), runs the legacy import
 * and raises `hasHydrated`. Failures are logged and never block the UI.
 */
export function StoreHydrator() {
  useEffect(() => {
    let cancelled = false;
    void hydrateStores({
      rehydrate: [
        () => useAlertsStore.persist.rehydrate(),
        () => useWatchlistStore.persist.rehydrate(),
        () => usePreferencesStore.persist.rehydrate(),
        () => useDecisionsStore.persist.rehydrate(),
      ],
      migrate: () => {
        migrateLegacyAlerts({ storage: window.localStorage, alerts: useAlertsStore, clock: systemClock });
      },
      logger: consoleLogger,
      hydration: useHydrationStore,
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
