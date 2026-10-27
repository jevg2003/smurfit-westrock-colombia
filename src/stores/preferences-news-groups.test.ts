import { describe, expect, it } from "vitest";
import { NEWS_GROUP_IDS, searchTermsOf, type CompanyProfile } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { buildNewsTermGroups, createPreferencesStore } from "./preferences.store";
import { createMemoryStorage } from "./test-utils";

const KEY = "swc:_:preferences:v1";

const setup = (profile: CompanyProfile | null = TEST_COMPANY, storage = createMemoryStorage()) => ({
  storage,
  create: () => createPreferencesStore({ storage, getProfile: () => profile ?? undefined }),
});

describe("preferences news term groups", () => {
  it("starts with the groups of the company profile", () => {
    const state = setup().create().getState();
    expect(Object.keys(state.newsTermGroups)).toEqual([...NEWS_GROUP_IDS]);
    expect(state.newsTermGroups.company).toEqual(TEST_COMPANY.newsGroups.company.terms);
    expect(state.newsTerms).toEqual(searchTermsOf(TEST_COMPANY));
  });

  it("starts with empty groups when there is no company", () => {
    const state = setup(null).create().getState();
    expect(state.newsTerms).toEqual([]);
    expect(state.newsTermGroups.sector).toEqual([]);
  });

  it("edits one group and keeps the flat list in sync, without duplicates", () => {
    const store = setup().create();
    store.getState().setNewsTermGroup("sector", [" acero ", "hierro", "hierro", ""]);

    expect(store.getState().newsTermGroups.sector).toEqual(["acero", "hierro"]);
    expect(store.getState().newsTerms).toContain("hierro");
    expect(store.getState().newsTerms).not.toContain("piezas metálicas");
  });

  it("restores the groups on reset and persists edits", async () => {
    const { create } = setup();
    create().getState().setNewsTermGroup("operations", ["gas natural"]);

    const fresh = create();
    await fresh.persist.rehydrate();
    expect(fresh.getState().newsTermGroups.operations).toEqual(["gas natural"]);

    fresh.getState().reset();
    expect(fresh.getState().newsTermGroups.operations).toEqual(TEST_COMPANY.newsGroups.operations.terms);
  });

  it("gives the energy spot thresholds their defaults when saved data lacks them", async () => {
    const { create } = setup(TEST_COMPANY, createMemoryStorage({ [KEY]: JSON.stringify({ state: { thresholds: { trmDailyMovePct: 1.5 } }, version: 1 }) }));
    const store = create();
    await store.persist.rehydrate();
    expect(store.getState().thresholds).toMatchObject({ trmDailyMovePct: 1.5, energySpotWeeklyMovePct: 15, energySpotWeeklyAlertPct: 30 });
  });

  it("keeps the profile groups when saved data has none", async () => {
    const { create } = setup(TEST_COMPANY, createMemoryStorage({ [KEY]: JSON.stringify({ state: { thresholds: { trmDailyMovePct: 1.5 }, newsTerms: ["a"] }, version: 1 }) }));
    const store = create();
    await store.persist.rehydrate();
    expect(store.getState().newsTermGroups.company.length).toBeGreaterThan(0);
    expect(store.getState().thresholds.trmDailyMovePct).toBe(1.5);
  });

  it("does not keep the values of another company when its key is empty", async () => {
    const { create } = setup();
    const store = create();
    store.getState().setNewsTermGroup("sector", ["solo mia"]);
    store.persist.setOptions({ name: "swc:otra:preferences:v1" });
    await store.persist.rehydrate();
    expect(store.getState().newsTermGroups.sector).toEqual(TEST_COMPANY.newsGroups.sector.terms);
  });
});

describe("preferences news context rules", () => {
  it("starts with the context and exclusion words of the profile", () => {
    const { newsContext } = setup().create().getState();
    expect(newsContext.company.requireAny).toEqual(TEST_COMPANY.colombiaContextWords);
    expect(newsContext.sector.requireAny).toEqual(TEST_COMPANY.colombiaContextWords);
    for (const id of NEWS_GROUP_IDS) expect(newsContext[id].excludeAny).toEqual(TEST_COMPANY.excludeWords);
  });

  it("gives data saved before the context rules existed the profile rules, keeping its terms", async () => {
    const { create } = setup(TEST_COMPANY, createMemoryStorage({ [KEY]: JSON.stringify({ state: { newsTermGroups: { sector: ["acero"] } }, version: 1 }) }));
    const store = create();
    await store.persist.rehydrate();
    expect(store.getState().newsContext.sector.requireAny).toContain("Colombia");
    expect(store.getState().newsTermGroups.sector).toEqual(["acero"]);
  });

  it("edits one group's words, cleaned and without duplicates, and persists them", async () => {
    const { create } = setup();
    create().getState().setNewsContext("company", { requireAny: [" Colombia ", "Colombia", ""], excludeAny: ["fútbol"] });
    const fresh = create();
    await fresh.persist.rehydrate();
    expect(fresh.getState().newsContext.company).toEqual({ requireAny: ["Colombia"], excludeAny: ["fútbol"] });
    expect(fresh.getState().newsContext.sector.excludeAny.length).toBeGreaterThan(0);
  });

  it("builds the matcher groups from the saved terms and words", () => {
    const store = setup().create();
    store.getState().setNewsContext("company", { requireAny: ["Medellín"], excludeAny: ["fútbol"] });
    const [company] = buildNewsTermGroups(store.getState(), TEST_COMPANY);
    expect(company.excludeAny).toEqual(["fútbol"]);
    expect(company.terms).toContainEqual({ term: "Empresa Ejemplo", requireAny: ["Medellín"] });
    expect(company.terms).toContain("Competidora Uno");
  });

  it("restores the profile words on reset", () => {
    const store = setup().create();
    store.getState().setNewsContext("sector", { requireAny: [], excludeAny: [] });
    store.getState().reset();
    expect(store.getState().newsContext.sector.requireAny).toContain("Colombia");
  });
});
