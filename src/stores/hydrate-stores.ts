import type { Logger } from "@/core/ports/logger";
import type { createHydrationStore } from "./hydration.store";

export interface HydrateStoresOptions {
  rehydrate: Array<() => unknown>;
  logger: Logger;
  hydration: ReturnType<typeof createHydrationStore>;
  isCancelled?: () => boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Rehydrates the persisted stores. Failures are logged, never thrown,
 * and the hydration flag is always raised so the UI does not wait forever.
 */
export async function hydrateStores({
  rehydrate,
  logger,
  hydration,
  isCancelled = () => false,
}: HydrateStoresOptions): Promise<void> {
  try {
    await Promise.all(rehydrate.map((run) => run()));
  } catch (error) {
    logger.error("store_rehydrate_failed", { message: messageOf(error) });
  }

  if (isCancelled()) return;
  hydration.getState().markHydrated();
}
