import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { IndicatorId } from "@/core/domain/observation";
import type { Watchlist } from "@/core/domain/watchlist";
import { COMPETITORS } from "@/content/config/empresa";
import { browserStorage } from "./browser-storage";

export const WATCHLIST_STORAGE_KEY = "swc:watchlist:v1";

export interface WatchlistState extends Watchlist {
  toggleCompetitor(nit: string): void;
  toggleIndicator(indicator: IndicatorId): void;
  /** Radar and timeline show only what is on the watchlist. */
  onlyFollowed: boolean;
  setOnlyFollowed(value: boolean): void;
}

const toggle = <T>(list: T[], item: T) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

export function createWatchlistStore({ storage }: { storage?: StateStorage } = {}) {
  return create<WatchlistState>()(
    persist(
      (set) => ({
        competitorNits: COMPETITORS.map((competitor) => competitor.nit),
        indicators: ["trm"],
        onlyFollowed: false,
        toggleCompetitor: (nit) => set((state) => ({ competitorNits: toggle(state.competitorNits, nit) })),
        toggleIndicator: (indicator) => set((state) => ({ indicators: toggle(state.indicators, indicator) })),
        setOnlyFollowed: (onlyFollowed) => set({ onlyFollowed }),
      }),
      {
        name: WATCHLIST_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
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
