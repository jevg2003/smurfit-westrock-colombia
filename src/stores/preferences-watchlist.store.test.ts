import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/core/company/defaults";
import { searchTermsOf } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { createPreferencesStore } from "./preferences.store";
import { createMemoryStorage } from "./test-utils";
import { createWatchlistStore } from "./watchlist.store";

const getProfile = () => TEST_COMPANY;
const FIRST_NIT = TEST_COMPANY.competitors[0].nit!;
const SECOND_NIT = TEST_COMPANY.competitors[1].nit!;

describe("watchlist store", () => {
  it("defaults to the competitors of the company that have a NIT", () => {
    const store = createWatchlistStore({ storage: createMemoryStorage(), getProfile });
    expect(store.getState().competitorNits).toEqual(TEST_COMPANY.competitors.map((competitor) => competitor.nit));
    expect(store.getState().indicators).toContain("trm");
  });

  it("skips competitors without NIT and follows nobody without a company", () => {
    const withoutNit = { ...TEST_COMPANY, competitors: [{ name: "Sin NIT" }, { name: "Con NIT", nit: "900000009" }] };
    expect(createWatchlistStore({ storage: createMemoryStorage(), getProfile: () => withoutNit }).getState().competitorNits).toEqual(["900000009"]);
    expect(createWatchlistStore({ storage: createMemoryStorage(), getProfile: () => undefined }).getState().competitorNits).toEqual([]);
  });

  it("toggles competitors and indicators", () => {
    const store = createWatchlistStore({ storage: createMemoryStorage(), getProfile });
    store.getState().toggleCompetitor(FIRST_NIT);
    expect(store.getState().competitorNits).not.toContain(FIRST_NIT);
    store.getState().toggleCompetitor(FIRST_NIT);
    expect(store.getState().competitorNits).toContain(FIRST_NIT);
    store.getState().toggleIndicator("pib");
    expect(store.getState().indicators).toContain("pib");
  });

  it("keeps the 'only my follows' filter off by default, toggles it and persists it", async () => {
    const storage = createMemoryStorage();
    const store = createWatchlistStore({ storage, getProfile });
    expect(store.getState().onlyFollowed).toBe(false);
    store.getState().setOnlyFollowed(true);
    expect(store.getState().onlyFollowed).toBe(true);

    const fresh = createWatchlistStore({ storage, getProfile });
    await fresh.persist.rehydrate();
    expect(fresh.getState().onlyFollowed).toBe(true);
  });

  it("accepts the exports indicator", () => {
    const store = createWatchlistStore({ storage: createMemoryStorage(), getProfile });
    store.getState().toggleIndicator("exportaciones");
    expect(store.getState().indicators).toContain("exportaciones");
  });

  it("persists under a company scoped, versioned key", async () => {
    const storage = createMemoryStorage();
    createWatchlistStore({ storage, getProfile, companyId: "acme" }).getState().toggleCompetitor(SECOND_NIT);
    expect(storage.data.has("swc:acme:watchlist:v1")).toBe(true);
    const fresh = createWatchlistStore({ storage, getProfile, companyId: "acme" });
    await fresh.persist.rehydrate();
    expect(fresh.getState().competitorNits).not.toContain(SECOND_NIT);
  });
});

describe("preferences store", () => {
  it("starts from the profile of the company", () => {
    const state = createPreferencesStore({ storage: createMemoryStorage(), getProfile }).getState();
    expect(state.thresholds).toEqual(TEST_COMPANY.thresholds);
    expect(state.newsTerms).toEqual(searchTermsOf(TEST_COMPANY));
    expect(state.briefingPeriod).toBe("previous-week");
  });

  it("falls back to the default thresholds without a company", () => {
    expect(createPreferencesStore({ storage: createMemoryStorage(), getProfile: () => undefined }).getState().thresholds).toEqual(DEFAULT_THRESHOLDS);
  });

  it("updates a threshold and rejects invalid values", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage(), getProfile });
    expect(store.getState().setThreshold("trmDailyMovePct", 2).ok).toBe(true);
    expect(store.getState().thresholds.trmDailyMovePct).toBe(2);
    for (const value of [0, -1, Number.NaN, Infinity]) {
      expect(store.getState().setThreshold("trmDailyMovePct", value).ok).toBe(false);
    }
    expect(store.getState().thresholds.trmDailyMovePct).toBe(2);
  });

  it("normalizes news terms", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage(), getProfile });
    store.getState().setNewsTerms([" acero ", "", "acero", "gas natural"]);
    expect(store.getState().newsTerms).toEqual(["acero", "gas natural"]);
  });

  it("resets to the profile and persists under a company scoped, versioned key", async () => {
    const storage = createMemoryStorage();
    const store = createPreferencesStore({ storage, getProfile, companyId: "acme" });
    store.getState().setThreshold("trmDailyMovePct", 3);
    expect(storage.data.has("swc:acme:preferences:v1")).toBe(true);
    const fresh = createPreferencesStore({ storage, getProfile, companyId: "acme" });
    await fresh.persist.rehydrate();
    expect(fresh.getState().thresholds.trmDailyMovePct).toBe(3);
    fresh.getState().reset();
    expect(fresh.getState().thresholds).toEqual(TEST_COMPANY.thresholds);
  });
});

describe("preferences store merge of thresholds", () => {
  it("fills thresholds added after the data was saved with the profile values", async () => {
    const saved = { state: { thresholds: { trmDailyMovePct: 3 }, newsTerms: ["x"], briefingPeriod: "previous-week" }, version: 1 };
    const storage = createMemoryStorage({ "swc:_:preferences:v1": JSON.stringify(saved) });
    const store = createPreferencesStore({ storage, getProfile });
    await store.persist.rehydrate();
    expect(store.getState().thresholds).toEqual({ ...TEST_COMPANY.thresholds, trmDailyMovePct: 3 });
  });
});
