import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { Result } from "@/core/domain/result";
import {
  DEFAULT_NEWS_CONTEXT,
  DEFAULT_NEWS_TERMS,
  DEFAULT_THRESHOLDS,
  LEGACY_NEWS_TERM_GROUPS,
  NEWS_TERM_GROUPS,
  type NewsContextRules,
  type NewsTermGroup,
  type Thresholds,
} from "@/content/config/empresa";
import type { TermGroup } from "@/core/text/match";
import { buildTermGroup } from "@/core/text/term-groups";
import { browserStorage } from "./browser-storage";

export const PREFERENCES_STORAGE_KEY = "swc:preferences:v1";

export type NewsTermGroupId = NewsTermGroup["id"];

export type BriefingPeriod = "previous-week" | "custom";

export interface PreferencesState {
  thresholds: Thresholds;
  /** Flat list of every group, kept in sync by `setNewsTermGroup`. */
  newsTerms: string[];
  newsTermGroups: Record<NewsTermGroupId, string[]>;
  /** Context words (for the company names that need them) and excluded words of each group. */
  newsContext: Record<NewsTermGroupId, NewsContextRules>;
  briefingPeriod: BriefingPeriod;
  setThreshold(key: keyof Thresholds, value: number): Result<number, { message: string }>;
  setNewsTerms(terms: string[]): void;
  setNewsTermGroup(id: NewsTermGroupId, terms: string[]): void;
  setNewsContext(id: NewsTermGroupId, rules: NewsContextRules): void;
  setBriefingPeriod(period: BriefingPeriod): void;
  reset(): void;
}

const cleanTerms = (terms: string[]) => [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0))];

const defaultGroups = () =>
  Object.fromEntries(NEWS_TERM_GROUPS.map((group) => [group.id, [...group.terms]])) as Record<NewsTermGroupId, string[]>;

const defaultContext = () =>
  Object.fromEntries(NEWS_TERM_GROUPS.map((group) => [group.id, { requireAny: [...DEFAULT_NEWS_CONTEXT[group.id].requireAny], excludeAny: [...DEFAULT_NEWS_CONTEXT[group.id].excludeAny] }])) as Record<
    NewsTermGroupId,
    NewsContextRules
  >;

/** The groups the matcher uses: the saved terms of each group with its saved context and excluded words. Pure. */
export function buildNewsTermGroups(state: Pick<PreferencesState, "newsTermGroups" | "newsContext">): TermGroup[] {
  return NEWS_TERM_GROUPS.map((group) =>
    buildTermGroup(
      { id: group.id, label: group.label, terms: state.newsTermGroups[group.id] ?? group.terms, contextTerms: group.contextTerms },
      state.newsContext[group.id] ?? DEFAULT_NEWS_CONTEXT[group.id],
    ),
  );
}

const sameTerms = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((term, index) => term === b[index]);

/**
 * Version 1 -> 2: groups that still hold the old generic defaults get the new phrase defaults.
 * A group the user edited in any way is left alone.
 */
function upgradeLegacyNewsTerms(saved: Partial<PreferencesState> | undefined): Partial<PreferencesState> | undefined {
  if (!saved?.newsTermGroups) return saved;
  const newsTermGroups = { ...saved.newsTermGroups };
  for (const group of NEWS_TERM_GROUPS) {
    const current = newsTermGroups[group.id];
    if (current && sameTerms(current, LEGACY_NEWS_TERM_GROUPS[group.id])) newsTermGroups[group.id] = [...group.terms];
  }
  return { ...saved, newsTermGroups, newsTerms: cleanTerms(Object.values(newsTermGroups).flat()) };
}

const defaults = () => ({
  thresholds: { ...DEFAULT_THRESHOLDS } as Thresholds,
  newsTerms: [...DEFAULT_NEWS_TERMS],
  newsTermGroups: defaultGroups(),
  newsContext: defaultContext(),
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
        setNewsContext: (id, rules) =>
          set((state) => ({ newsContext: { ...state.newsContext, [id]: { requireAny: cleanTerms(rules.requireAny), excludeAny: cleanTerms(rules.excludeAny) } } })),
        setBriefingPeriod: (briefingPeriod) => set({ briefingPeriod }),
        reset: () => set(defaults()),
      }),
      {
        name: PREFERENCES_STORAGE_KEY,
        version: 3,
        storage: browserStorage(storage),
        skipHydration: true,
        // Version 3 only adds `newsContext`; data saved without it gets the defaults through `merge` below.
        migrate: (persisted, version) => (version < 2 ? upgradeLegacyNewsTerms(persisted as Partial<PreferencesState> | undefined) : persisted) as PreferencesState,
        // Thresholds added in later releases must keep their defaults when old data is loaded.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<PreferencesState>;
          return {
            ...current,
            ...saved,
            thresholds: { ...current.thresholds, ...saved.thresholds },
            newsTermGroups: { ...current.newsTermGroups, ...saved.newsTermGroups },
            newsContext: { ...current.newsContext, ...saved.newsContext },
          };
        },
        partialize: (state) => ({
          thresholds: state.thresholds,
          newsTerms: state.newsTerms,
          newsTermGroups: state.newsTermGroups,
          newsContext: state.newsContext,
          briefingPeriod: state.briefingPeriod,
        }),
      },
    ),
  );
}

export const usePreferencesStore = createPreferencesStore();
