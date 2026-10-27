/** Names of the stores whose data belongs to one company. */
export type ScopedStoreName = "alerts" | "chats" | "decisions" | "preferences" | "watchlist";

/** Company used before any company is active; nothing is meant to be written under it. */
export const UNSCOPED_COMPANY = "_";

/** Storage key of a store for a company: `swc:<companyId>:<name>:v1`. */
export const scopedKey = (companyId: string, name: ScopedStoreName) => `swc:${companyId}:${name}:v1`;

interface PersistedStore {
  persist: {
    setOptions(options: { name: string }): void;
    rehydrate(): Promise<void> | void;
  };
}

/**
 * Points a persisted store at the data of another company and loads it. Every scoped store rebuilds its
 * whole state from defaults plus what is saved (see its `merge`), so nothing of the previous company
 * survives when the new key is empty.
 */
export async function bindStoreToCompany(store: PersistedStore, companyId: string, name: ScopedStoreName): Promise<void> {
  store.persist.setOptions({ name: scopedKey(companyId, name) });
  await store.persist.rehydrate();
}
