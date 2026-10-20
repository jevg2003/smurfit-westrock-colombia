import type { Logger } from "@/core/ports/logger";
import type { createHydrationStore } from "./hydration.store";

export interface HydrateStoresOptions {
  rehydrate: Array<() => unknown>;
  /** Runs after every store is rehydrated (legacy import). */
  migrate: () => void;
  logger: Logger;
  hydration: ReturnType<typeof createHydrationStore>;
  isCancelled?: () => boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Rehydrates the persisted stores, then runs the migration. Failures are logged, never thrown,
 * and the hydration flag is always raised so the UI does not wait forever.
 */
export async function hydrateStores({
  rehydrate,
  migrate,
  logger,
  hydration,
  isCancelled = () => false,
}: HydrateStoresOptions): Promise<void> {
  let rehydrated = false;
  try {
    await Promise.all(rehydrate.map((run) => run()));
    rehydrated = true;
  } catch (error) {
    logger.error("store_rehydrate_failed", { message: messageOf(error) });
  }

  if (isCancelled()) return;

  if (rehydrated) {
    try {
      migrate();
    } catch (error) {
      logger.error("legacy_migration_failed", { message: messageOf(error) });
    }
  }
  hydration.getState().markHydrated();
}
