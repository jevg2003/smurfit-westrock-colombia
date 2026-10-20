import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { Result } from "@/core/domain/result";
import { DEFAULT_NEWS_TERMS, DEFAULT_THRESHOLDS, type Thresholds } from "@/content/config/empresa";
import { browserStorage } from "./browser-storage";

export const PREFERENCES_STORAGE_KEY = "swc:preferences:v1";

export type BriefingPeriod = "previous-week" | "custom";

export interface PreferencesState {
  thresholds: Thresholds;
  newsTerms: string[];
  briefingPeriod: BriefingPeriod;
  setThreshold(key: keyof Thresholds, value: number): Result<number, { message: string }>;
  setNewsTerms(terms: string[]): void;
  setBriefingPeriod(period: BriefingPeriod): void;
  reset(): void;
}

const defaults = () => ({
  thresholds: { ...DEFAULT_THRESHOLDS } as Thresholds,
  newsTerms: [...DEFAULT_NEWS_TERMS],
  briefingPeriod: "previous-week" as BriefingPeriod,
});

export function createPreferencesStore({ storage }: { storage?: StateStorage } = {}) {
  return create<PreferencesState>()(
    persist(
      (set) => ({
        ...defaults(),
        setThreshold: (key, value) => {
          if (!Number.isFinite(value) || value <= 0) {
            return { ok: false, error: { message: "El umbral debe ser un número mayor que cero." } };
          }
          set((state) => ({ thresholds: { ...state.thresholds, [key]: value } }));
          return { ok: true, value };
        },
        setNewsTerms: (terms) =>
          set({ newsTerms: [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0))] }),
        setBriefingPeriod: (briefingPeriod) => set({ briefingPeriod }),
        reset: () => set(defaults()),
      }),
      {
        name: PREFERENCES_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({
          thresholds: state.thresholds,
          newsTerms: state.newsTerms,
          briefingPeriod: state.briefingPeriod,
        }),
      },
    ),
  );
}

export const usePreferencesStore = createPreferencesStore();
