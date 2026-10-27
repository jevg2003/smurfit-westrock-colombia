"use client";

import { useEffect } from "react";
import { consoleLogger } from "@/infrastructure/logging/console-logger";
import { useAlertsStore } from "./alerts.store";
import { useChatStore } from "./chat.store";
import { useCompaniesStore } from "./companies.store";
import { bindStoreToCompany } from "./company-scope";
import { useDecisionsStore } from "./decisions.store";
import { hydrateStores } from "./hydrate-stores";
import { useHydrationStore } from "./hydration.store";
import { useOnboardingDraftStore } from "./onboarding-draft.store";
import { usePreferencesStore } from "./preferences.store";
import { useWatchlistStore } from "./watchlist.store";

/** Loads the data of one company into every store that keeps per-company data. */
const bindCompany = (companyId: string) => [
  () => bindStoreToCompany(useAlertsStore, companyId, "alerts"),
  () => bindStoreToCompany(useChatStore, companyId, "chats"),
  () => bindStoreToCompany(useDecisionsStore, companyId, "decisions"),
  () => bindStoreToCompany(usePreferencesStore, companyId, "preferences"),
  () => bindStoreToCompany(useWatchlistStore, companyId, "watchlist"),
];

/**
 * Rehydrates the companies after mount (the stores use `skipHydration`), points the per-company stores at the
 * active company and raises `hasHydrated`. When the active company changes, it does the same again for the
 * new one. Failures are logged and never block the UI.
 */
export function StoreHydrator() {
  useEffect(() => {
    let cancelled = false;
    let bound: string | null = null;
    let unsubscribe: (() => void) | undefined;

    // A fresh mount (for example after leaving the company picker) must not trust a flag raised for another company.
    useHydrationStore.getState().markHydrating();

    const bindActive = async () => {
      const { activeCompanyId } = useCompaniesStore.getState();
      bound = activeCompanyId;
      await hydrateStores({
        rehydrate: activeCompanyId ? bindCompany(activeCompanyId) : [],
        logger: consoleLogger,
        hydration: useHydrationStore,
        isCancelled: () => cancelled,
      });
    };

    void (async () => {
      try {
        // The onboarding draft is not tied to a company, so it loads with the company list.
        await Promise.all([useCompaniesStore.persist.rehydrate(), useOnboardingDraftStore.persist.rehydrate()]);
      } catch (error) {
        consoleLogger.error("store_rehydrate_failed", { message: error instanceof Error ? error.message : String(error) });
      }
      if (cancelled) return;
      await bindActive();
      if (cancelled) return;
      unsubscribe = useCompaniesStore.subscribe((state) => {
        if (state.activeCompanyId === bound) return;
        useHydrationStore.getState().markHydrating();
        void bindActive();
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
