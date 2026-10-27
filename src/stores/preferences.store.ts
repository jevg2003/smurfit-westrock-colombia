import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import { contextRulesOf } from "@/core/company/context";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/core/company/defaults";
import {
  NEWS_GROUP_IDS,
  deriveNewsGroupDefinitions,
  searchTermsOf,
  type CompanyProfile,
  type NewsGroupId,
} from "@/core/company/profile";
import type { Result } from "@/core/domain/result";
import type { TermGroup } from "@/core/text/match";
import { buildTermGroup } from "@/core/text/term-groups";
import { browserStorage } from "./browser-storage";
import { UNSCOPED_COMPANY, scopedKey } from "./company-scope";
import { selectActiveCompany, useCompaniesStore } from "./companies.store";

export type NewsTermGroupId = NewsGroupId;

/** The context rules a user can edit for each group. */
export interface NewsContextRules {
  /** A context term counts only if the title also has one of these words. */
  requireAny: string[];
  /** The group ignores a title that has any of these words. */
  excludeAny: string[];
}

export type BriefingPeriod = "previous-week" | "custom";

export interface PreferencesState {
  thresholds: Thresholds;
  /** Flat list of every group, kept in sync by `setNewsTermGroup`. */
  newsTerms: string[];
  newsTermGroups: Record<NewsTermGroupId, string[]>;
  /** Context words (for the terms that need them) and excluded words of each group. */
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

const byGroup = <T>(build: (id: NewsTermGroupId) => T) => Object.fromEntries(NEWS_GROUP_IDS.map((id) => [id, build(id)])) as Record<NewsTermGroupId, T>;

/** The groups the matcher uses: the saved terms of each group with its saved context and excluded words. Pure. */
export function buildNewsTermGroups(
  state: Pick<PreferencesState, "newsTermGroups" | "newsContext">,
  profile: Pick<CompanyProfile, "newsGroups">,
): TermGroup[] {
  return deriveNewsGroupDefinitions(profile).map((group) =>
    buildTermGroup(
      { ...group, terms: state.newsTermGroups[group.id] ?? group.terms },
      state.newsContext[group.id] ?? { requireAny: [], excludeAny: [] },
    ),
  );
}

/** What a company starts with, taken from its profile. Without a profile everything is empty. */
export function preferencesDefaults(profile: CompanyProfile | undefined) {
  const definitions = profile ? deriveNewsGroupDefinitions(profile) : [];
  const group = (id: NewsTermGroupId) => definitions.find((definition) => definition.id === id);
  return {
    thresholds: { ...(profile?.thresholds ?? DEFAULT_THRESHOLDS) } as Thresholds,
    newsTerms: profile ? searchTermsOf(profile) : [],
    newsTermGroups: byGroup((id) => [...(group(id)?.terms ?? [])]),
    newsContext: byGroup((id): NewsContextRules => {
      const definition = group(id);
      if (!profile || !definition) return { requireAny: [], excludeAny: [] };
      return contextRulesOf(profile, definition);
    }),
    briefingPeriod: "previous-week" as BriefingPeriod,
  };
}

export interface PreferencesStoreOptions {
  storage?: StateStorage;
  /** Company whose data the store starts on; `bindStoreToCompany` moves it later. */
  companyId?: string;
  /** Where the defaults come from. The app reads the active company. */
  getProfile?: () => CompanyProfile | undefined;
}

const activeProfile = () => selectActiveCompany(useCompaniesStore.getState());

export function createPreferencesStore({ storage, companyId = UNSCOPED_COMPANY, getProfile = activeProfile }: PreferencesStoreOptions = {}) {
  return create<PreferencesState>()(
    persist(
      (set) => ({
        ...preferencesDefaults(getProfile()),
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
        reset: () => set(preferencesDefaults(getProfile())),
      }),
      {
        name: scopedKey(companyId, "preferences"),
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        // Starts from the defaults of the active company, so switching company never keeps the previous one's
        // values; anything added to the profile later keeps its default when older data is loaded.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<PreferencesState>;
          const defaults = preferencesDefaults(getProfile());
          return {
            ...current,
            ...defaults,
            ...saved,
            thresholds: { ...defaults.thresholds, ...saved.thresholds },
            newsTermGroups: { ...defaults.newsTermGroups, ...saved.newsTermGroups },
            newsContext: { ...defaults.newsContext, ...saved.newsContext },
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
