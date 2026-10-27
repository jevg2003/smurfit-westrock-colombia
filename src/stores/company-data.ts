import type { StateStorage } from "zustand/middleware";
import { useCompaniesStore } from "./companies.store";

const browserKeys = (): string[] => Object.keys(window.localStorage);

/**
 * Removes everything this browser saved for one company: the keys of its stores and of its onboarding draft
 * (all of them start with `swc:<id>:`). Other companies and the company list are not touched.
 */
export function removeCompanyData(
  companyId: string,
  storage: Pick<StateStorage, "removeItem"> = window.localStorage,
  listKeys: () => string[] = browserKeys,
): void {
  const prefix = `swc:${companyId}:`;
  for (const key of listKeys()) {
    if (key.startsWith(prefix)) storage.removeItem(key);
  }
}

/** Deletes a company and all its saved data from this browser. */
export function deleteCompany(companyId: string): void {
  useCompaniesStore.getState().remove(companyId);
  try {
    removeCompanyData(companyId);
  } catch {
    // Blocked storage: the profile is already gone, so there is nothing else to clean.
  }
}
