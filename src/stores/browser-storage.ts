import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** Resolves the storage lazily so importing a store never touches `window` on the server. */
export function browserStorage(storage?: StateStorage) {
  return createJSONStorage(() => storage ?? localStorage);
}
