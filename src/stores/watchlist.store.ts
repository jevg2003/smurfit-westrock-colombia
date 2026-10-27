import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import { withNitCompetitors, type CompanyProfile } from "@/core/company/profile";
import type { IndicatorId } from "@/core/domain/observation";
import type { Watchlist } from "@/core/domain/watchlist";
import { browserStorage } from "./browser-storage";
import { UNSCOPED_COMPANY, scopedKey } from "./company-scope";
import { selectActiveCompany, useCompaniesStore } from "./companies.store";

export interface WatchlistState extends Watchlist {
  toggleCompetitor(nit: string): void;
  toggleIndicator(indicator: IndicatorId): void;
  /** Radar and timeline show only what is on the watchlist. */
  onlyFollowed: boolean;
  setOnlyFollowed(value: boolean): void;
}

const toggle = <T>(list: T[], item: T) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

/** A company starts following every competitor it can look up by NIT, and the TRM. */
export function watchlistDefaults(profile: CompanyProfile | undefined) {
  return {
    competitorNits: profile ? withNitCompetitors(profile).map((competitor) => competitor.nit) : [],
    indicators: ["trm"] as IndicatorId[],
    onlyFollowed: false,
  };
}

export interface WatchlistStoreOptions {
  storage?: StateStorage;
  /** Company whose data the store starts on; `bindStoreToCompany` moves it later. */
  companyId?: string;
  /** Where the defaults come from. The app reads the active company. */
  getProfile?: () => CompanyProfile | undefined;
}

const activeProfile = () => selectActiveCompany(useCompaniesStore.getState());

export function createWatchlistStore({ storage, companyId = UNSCOPED_COMPANY, getProfile = activeProfile }: WatchlistStoreOptions = {}) {
  return create<WatchlistState>()(
    persist(
      (set) => ({
        ...watchlistDefaults(getProfile()),
        toggleCompetitor: (nit) => set((state) => ({ competitorNits: toggle(state.competitorNits, nit) })),
        toggleIndicator: (indicator) => set((state) => ({ indicators: toggle(state.indicators, indicator) })),
        setOnlyFollowed: (onlyFollowed) => set({ onlyFollowed }),
      }),
      {
        name: scopedKey(companyId, "watchlist"),
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        // Defaults of the active company first, so switching company never keeps the previous one's follows.
        merge: (persisted, current) => ({ ...current, ...watchlistDefaults(getProfile()), ...((persisted ?? {}) as Partial<WatchlistState>) }),
        partialize: (state) => ({
          competitorNits: state.competitorNits,
          indicators: state.indicators,
          onlyFollowed: state.onlyFollowed,
        }),
      },
    ),
  );
}

export const useWatchlistStore = createWatchlistStore();
