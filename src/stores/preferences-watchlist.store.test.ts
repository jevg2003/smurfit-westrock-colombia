import { describe, expect, it } from "vitest";
import { COMPETITORS, DEFAULT_NEWS_TERMS, DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { createPreferencesStore } from "./preferences.store";
import { createMemoryStorage } from "./test-utils";
import { createWatchlistStore } from "./watchlist.store";

describe("watchlist store", () => {
  it("defaults to the configured competitors", () => {
    const store = createWatchlistStore({ storage: createMemoryStorage() });
    expect(store.getState().competitorNits).toEqual(COMPETITORS.map((competitor) => competitor.nit));
    expect(store.getState().indicators).toContain("trm");
  });

  it("toggles competitors and indicators", () => {
    const store = createWatchlistStore({ storage: createMemoryStorage() });
    store.getState().toggleCompetitor("860026759");
    expect(store.getState().competitorNits).not.toContain("860026759");
    store.getState().toggleCompetitor("860026759");
    expect(store.getState().competitorNits).toContain("860026759");
    store.getState().toggleIndicator("pib");
    expect(store.getState().indicators).toContain("pib");
  });

  it("persists under a versioned key", async () => {
    const storage = createMemoryStorage();
    createWatchlistStore({ storage }).getState().toggleCompetitor("890319047");
    expect(storage.data.has("swc:watchlist:v1")).toBe(true);
    const fresh = createWatchlistStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().competitorNits).not.toContain("890319047");
  });
});

describe("preferences store", () => {
  it("starts from the configured defaults", () => {
    const state = createPreferencesStore({ storage: createMemoryStorage() }).getState();
    expect(state.thresholds).toEqual(DEFAULT_THRESHOLDS);
    expect(state.newsTerms).toEqual([...DEFAULT_NEWS_TERMS]);
    expect(state.briefingPeriod).toBe("previous-week");
  });

  it("updates a threshold and rejects invalid values", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage() });
    expect(store.getState().setThreshold("trmDailyMovePct", 2).ok).toBe(true);
    expect(store.getState().thresholds.trmDailyMovePct).toBe(2);
    for (const value of [0, -1, Number.NaN, Infinity]) {
      expect(store.getState().setThreshold("trmDailyMovePct", value).ok).toBe(false);
    }
    expect(store.getState().thresholds.trmDailyMovePct).toBe(2);
  });

  it("normalizes news terms", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage() });
    store.getState().setNewsTerms([" papel ", "", "papel", "gas natural"]);
    expect(store.getState().newsTerms).toEqual(["papel", "gas natural"]);
  });

  it("resets to defaults and persists under a versioned key", async () => {
    const storage = createMemoryStorage();
    const store = createPreferencesStore({ storage });
    store.getState().setThreshold("trmDailyMovePct", 3);
    expect(storage.data.has("swc:preferences:v1")).toBe(true);
    const fresh = createPreferencesStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().thresholds.trmDailyMovePct).toBe(3);
    fresh.getState().reset();
    expect(fresh.getState().thresholds).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe("preferences store migration of thresholds", () => {
  it("fills thresholds added after the data was saved with their defaults", async () => {
    const saved = { state: { thresholds: { trmDailyMovePct: 3 }, newsTerms: ["x"], briefingPeriod: "previous-week" }, version: 1 };
    const storage = createMemoryStorage({ "swc:preferences:v1": JSON.stringify(saved) });
    const store = createPreferencesStore({ storage });
    await store.persist.rehydrate();
    expect(store.getState().thresholds).toEqual({ ...DEFAULT_THRESHOLDS, trmDailyMovePct: 3 });
  });
});
