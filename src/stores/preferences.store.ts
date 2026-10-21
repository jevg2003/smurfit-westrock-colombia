import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { Result } from "@/core/domain/result";
import { DEFAULT_NEWS_TERMS, DEFAULT_THRESHOLDS, NEWS_TERM_GROUPS, type NewsTermGroup, type Thresholds } from "@/content/config/empresa";
import { browserStorage } from "./browser-storage";

export const PREFERENCES_STORAGE_KEY = "swc:preferences:v1";

export type NewsTermGroupId = NewsTermGroup["id"];

export type BriefingPeriod = "previous-week" | "custom";

export interface PreferencesState {
  thresholds: Thresholds;
  /** Flat list of every group, kept in sync by `setNewsTermGroup`. */
  newsTerms: string[];
  newsTermGroups: Record<NewsTermGroupId, string[]>;
  briefingPeriod: BriefingPeriod;
  setThreshold(key: keyof Thresholds, value: number): Result<number, { message: string }>;
  setNewsTerms(terms: string[]): void;
  setNewsTermGroup(id: NewsTermGroupId, terms: string[]): void;
  setBriefingPeriod(period: BriefingPeriod): void;
  reset(): void;
}

const cleanTerms = (terms: string[]) => [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0))];

const defaultGroups = () =>
  Object.fromEntries(NEWS_TERM_GROUPS.map((group) => [group.id, [...group.terms]])) as Record<NewsTermGroupId, string[]>;

const defaults = () => ({
  thresholds: { ...DEFAULT_THRESHOLDS } as Thresholds,
  newsTerms: [...DEFAULT_NEWS_TERMS],
  newsTermGroups: defaultGroups(),
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
        setNewsTerms: (terms) => set({ newsTerms: cleanTerms(terms) }),
        setNewsTermGroup: (id, terms) =>
          set((state) => {
            const newsTermGroups = { ...state.newsTermGroups, [id]: cleanTerms(terms) };
            return { newsTermGroups, newsTerms: cleanTerms(Object.values(newsTermGroups).flat()) };
          }),
        setBriefingPeriod: (briefingPeriod) => set({ briefingPeriod }),
        reset: () => set(defaults()),
      }),
      {
        name: PREFERENCES_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        // Thresholds added in later releases must keep their defaults when old data is loaded.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<PreferencesState>;
          return {
            ...current,
            ...saved,
            thresholds: { ...current.thresholds, ...saved.thresholds },
            newsTermGroups: { ...current.newsTermGroups, ...saved.newsTermGroups },
          };
        },
        partialize: (state) => ({
          thresholds: state.thresholds,
          newsTerms: state.newsTerms,
          newsTermGroups: state.newsTermGroups,
          briefingPeriod: state.briefingPeriod,
        }),
      },
    ),
  );
}

export const usePreferencesStore = createPreferencesStore();
