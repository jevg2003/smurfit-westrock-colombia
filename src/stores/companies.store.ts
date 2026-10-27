import "@/lib/zod-config";
import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import { companyProfileSchema, type CompanyProfile } from "@/core/company/profile";
import type { Clock } from "@/core/ports/clock";
import { browserStorage } from "./browser-storage";
import { systemClock } from "./system-clock";

export const COMPANIES_STORAGE_KEY = "swc:companies:v1";

/** Fields of a profile that `update` may change. The id and the creation date never change. */
export type CompanyPatch = Partial<Omit<CompanyProfile, "id" | "createdAt" | "updatedAt">>;

export interface CompaniesState {
  companies: CompanyProfile[];
  /** The company whose data the app shows; null means "signed out" (the picker decides what to show). */
  activeCompanyId: string | null;
  /** Adds a profile (replacing one with the same id). It does not make it active. */
  add(profile: CompanyProfile): void;
  update(id: string, patch: CompanyPatch): void;
  /** Removes the profile and clears the active company if it was this one. Its saved data stays in the browser. */
  remove(id: string): void;
  /** Makes an existing company active; an unknown id is ignored. */
  setActive(id: string): void;
  clearActive(): void;
}

export interface CompaniesStoreOptions {
  storage?: StateStorage;
  clock?: Clock;
}

export function createCompaniesStore({ storage, clock = systemClock }: CompaniesStoreOptions = {}) {
  return create<CompaniesState>()(
    persist(
      (set, get) => ({
        companies: [],
        activeCompanyId: null,
        add: (profile) => set((state) => ({ companies: [...state.companies.filter((company) => company.id !== profile.id), profile] })),
        update: (id, patch) =>
          set((state) => ({
            companies: state.companies.map((company) => (company.id === id ? { ...company, ...patch, updatedAt: clock.now().toISOString() } : company)),
          })),
        remove: (id) =>
          set((state) => ({
            companies: state.companies.filter((company) => company.id !== id),
            activeCompanyId: state.activeCompanyId === id ? null : state.activeCompanyId,
          })),
        setActive: (id) => {
          if (get().companies.some((company) => company.id === id)) set({ activeCompanyId: id });
        },
        clearActive: () => set({ activeCompanyId: null }),
      }),
      {
        name: COMPANIES_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({ companies: state.companies, activeCompanyId: state.activeCompanyId }),
        // Profiles that do not pass the schema are dropped, so corrupt JSON never breaks the app.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as { companies?: unknown; activeCompanyId?: unknown };
          const companies = Array.isArray(saved.companies)
            ? saved.companies.flatMap((item) => {
                const parsed = companyProfileSchema.safeParse(item);
                return parsed.success ? [parsed.data] : [];
              })
            : [];
          const activeCompanyId =
            typeof saved.activeCompanyId === "string" && companies.some((company) => company.id === saved.activeCompanyId) ? saved.activeCompanyId : null;
          return { ...current, companies, activeCompanyId };
        },
      },
    ),
  );
}

export const useCompaniesStore = createCompaniesStore();

export const selectActiveCompany = (state: Pick<CompaniesState, "companies" | "activeCompanyId">): CompanyProfile | undefined =>
  state.companies.find((company) => company.id === state.activeCompanyId);

/** The active company, or undefined when none is active. */
export function useActiveCompany(): CompanyProfile | undefined {
  return useCompaniesStore(selectActiveCompany);
}

/**
 * The active company for screens that only render once one is active (the app layout guarantees it).
 * Throws instead of returning undefined so a missing guard fails loudly.
 */
export function useCompany(): CompanyProfile {
  const company = useActiveCompany();
  if (!company) throw new Error("No hay una empresa activa.");
  return company;
}
