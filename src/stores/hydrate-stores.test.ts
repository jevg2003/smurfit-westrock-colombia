import { describe, expect, it, vi } from "vitest";
import type { Logger } from "@/core/ports/logger";
import { hydrateStores } from "./hydrate-stores";
import { createHydrationStore } from "./hydration.store";

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("hydrateStores", () => {
  it("rehydrates every store and then flags them as hydrated", async () => {
    const order: string[] = [];
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [async () => void order.push("a"), () => void order.push("b")],
      logger: makeLogger(),
      hydration,
    });
    expect(order).toEqual(["a", "b"]);
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("logs a rehydrate failure and still flags hydrated", async () => {
    const logger = makeLogger();
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [() => Promise.reject(new Error("boom"))],
      logger,
      hydration,
    });
    expect(logger.error).toHaveBeenCalledWith("store_rehydrate_failed", expect.objectContaining({ message: "boom" }));
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("can be raised again while another company loads", async () => {
    const hydration = createHydrationStore();
    await hydrateStores({ rehydrate: [], logger: makeLogger(), hydration });
    hydration.getState().markHydrating();
    expect(hydration.getState().hasHydrated).toBe(false);
    await hydrateStores({ rehydrate: [], logger: makeLogger(), hydration });
    expect(hydration.getState().hasHydrated).toBe(true);
  });

  it("does not flag hydrated when cancelled", async () => {
    const hydration = createHydrationStore();
    await hydrateStores({
      rehydrate: [],
      logger: makeLogger(),
      hydration,
      isCancelled: () => true,
    });
    expect(hydration.getState().hasHydrated).toBe(false);
  });
});
