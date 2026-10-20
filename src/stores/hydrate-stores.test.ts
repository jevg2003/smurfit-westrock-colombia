import { describe, expect, it, vi } from "vitest";
import type { Logger } from "@/core/ports/logger";
import { hydrateStores } from "./hydrate-stores";
import { createHydrationStore } from "./hydration.store";

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("hydrateStores", () => {
  it("rehydrates, migrates and then flags the stores as hydrated", async () => {
    const order: string[] = [];
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [async () => void order.push("a"), () => void order.push("b")],
      migrate: () => void order.push("migrate"),
      logger: makeLogger(),
      hydration,
    });
    expect(order).toEqual(["a", "b", "migrate"]);
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("logs a rehydrate failure, skips the migration and still flags hydrated", async () => {
    const logger = makeLogger();
    const migrate = vi.fn();
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [() => Promise.reject(new Error("boom"))],
      migrate,
      logger,
      hydration,
    });
    expect(logger.error).toHaveBeenCalledWith("store_rehydrate_failed", expect.objectContaining({ message: "boom" }));
    expect(migrate).not.toHaveBeenCalled();
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("logs a migration failure and still flags hydrated", async () => {
    const logger = makeLogger();
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [],
      migrate: () => {
        throw new Error("bad legacy");
      },
      logger,
      hydration,
    });
    expect(logger.error).toHaveBeenCalledWith("legacy_migration_failed", expect.objectContaining({ message: "bad legacy" }));
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("does not flag hydrated when cancelled", async () => {
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [],
      migrate: () => {},
      logger: makeLogger(),
      hydration,
      isCancelled: () => true,
    });
    expect(hydration.getState().hasHydrated).toBe(false);
  });
});
