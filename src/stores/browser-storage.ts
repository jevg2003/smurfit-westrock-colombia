import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { consoleLogger } from "@/infrastructure/logging/console-logger";

/**
 * A storage whose reads and writes never throw. A full quota or a blocked storage (private mode) keeps the
 * in-memory state working and only loses persistence, so it is logged instead of breaking the screen.
 */
function guarded(storage: StateStorage): StateStorage {
  return {
    getItem: (name) => {
      try {
        return storage.getItem(name);
      } catch (error) {
        consoleLogger.warn("storage_read_failed", { name, message: error instanceof Error ? error.message : String(error) });
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        return storage.setItem(name, value);
      } catch (error) {
        consoleLogger.warn("storage_write_failed", { name, message: error instanceof Error ? error.message : String(error) });
      }
    },
    removeItem: (name) => {
      try {
        return storage.removeItem(name);
      } catch (error) {
        consoleLogger.warn("storage_remove_failed", { name, message: error instanceof Error ? error.message : String(error) });
      }
    },
  };
}

/** Resolves the storage lazily so importing a store never touches `window` on the server. */
export function browserStorage(storage?: StateStorage) {
  return createJSONStorage(() => guarded(storage ?? localStorage));
}
