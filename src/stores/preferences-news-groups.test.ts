import { describe, expect, it } from "vitest";
import { DEFAULT_NEWS_CONTEXT, DEFAULT_NEWS_TERMS, LEGACY_NEWS_TERM_GROUPS, NEWS_TERM_GROUPS } from "@/content/config/empresa";
import { buildNewsTermGroups, createPreferencesStore } from "./preferences.store";
import { createMemoryStorage } from "./test-utils";

describe("preferences news term groups", () => {
  it("starts with the configured groups", () => {
    const state = createPreferencesStore({ storage: createMemoryStorage() }).getState();
    expect(Object.keys(state.newsTermGroups)).toEqual(NEWS_TERM_GROUPS.map((group) => group.id));
  });

  it("edits one group and keeps the flat list in sync, without duplicates", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage() });
    store.getState().setNewsTermGroup("sector", [" cartón corrugado ", "kraft", "kraft", ""]);

    expect(store.getState().newsTermGroups.sector).toEqual(["cartón corrugado", "kraft"]);
    expect(store.getState().newsTerms).toContain("kraft");
    expect(store.getState().newsTerms).not.toContain("celulosa");
  });

  it("restores the groups on reset and persists edits", async () => {
    const storage = createMemoryStorage();
    const store = createPreferencesStore({ storage });
    store.getState().setNewsTermGroup("operations", ["gas natural"]);

    const fresh = createPreferencesStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().newsTermGroups.operations).toEqual(["gas natural"]);

    fresh.getState().reset();
    expect(fresh.getState().newsTermGroups.operations).toEqual([...NEWS_TERM_GROUPS[3].terms]);
  });

  it("gives the energy spot thresholds their defaults when old persisted data lacks them", async () => {
    const storage = createMemoryStorage({
      "swc:preferences:v1": JSON.stringify({ state: { thresholds: { trmDailyMovePct: 1.5 } }, version: 1 }),
    });
    const store = createPreferencesStore({ storage });
    await store.persist.rehydrate();
    expect(store.getState().thresholds).toMatchObject({ trmDailyMovePct: 1.5, energySpotWeeklyMovePct: 15, energySpotWeeklyAlertPct: 30 });
  });

  it("keeps the default groups when old persisted data has none", async () => {
    const storage = createMemoryStorage({
      "swc:preferences:v1": JSON.stringify({ state: { thresholds: { trmDailyMovePct: 1.5 }, newsTerms: ["a"] }, version: 1 }),
    });
    const store = createPreferencesStore({ storage });
    await store.persist.rehydrate();
    expect(store.getState().newsTermGroups.company.length).toBeGreaterThan(0);
    expect(store.getState().thresholds.trmDailyMovePct).toBe(1.5);
  });
});

describe("preferences news term defaults migration", () => {
  const persisted = (state: object) =>
    createMemoryStorage({ "swc:preferences:v1": JSON.stringify({ state, version: 1 }) });

  it("replaces groups that still hold the old defaults with the new defaults", async () => {
    const store = createPreferencesStore({
      storage: persisted({
        newsTermGroups: Object.fromEntries(Object.entries(LEGACY_NEWS_TERM_GROUPS).map(([id, terms]) => [id, [...terms]])),
      }),
    });
    await store.persist.rehydrate();
    const groups = store.getState().newsTermGroups;
    for (const group of NEWS_TERM_GROUPS) expect(groups[group.id]).toEqual([...group.terms]);
    expect(groups.sector).not.toContain("papel");
    expect(store.getState().newsTerms).toEqual([...DEFAULT_NEWS_TERMS]);
  });

  it("keeps customised groups and still upgrades the untouched ones", async () => {
    const store = createPreferencesStore({
      storage: persisted({
        newsTermGroups: {
          company: [...LEGACY_NEWS_TERM_GROUPS.company],
          sector: ["papel", "mi término"],
          regulation: [...LEGACY_NEWS_TERM_GROUPS.regulation],
          operations: [...LEGACY_NEWS_TERM_GROUPS.operations],
        },
      }),
    });
    await store.persist.rehydrate();
    const groups = store.getState().newsTermGroups;
    expect(groups.sector).toEqual(["papel", "mi término"]);
    expect(groups.company).toEqual([...NEWS_TERM_GROUPS[0].terms]);
  });

  it("does not touch groups saved by the current version", async () => {
    const storage = createMemoryStorage();
    const first = createPreferencesStore({ storage });
    first.getState().setNewsTermGroup("sector", ["papel"]);
    const second = createPreferencesStore({ storage });
    await second.persist.rehydrate();
    expect(second.getState().newsTermGroups.sector).toEqual(["papel"]);
  });
});

describe("preferences news context rules", () => {
  const persisted = (state: object, version: number) => createMemoryStorage({ "swc:preferences:v1": JSON.stringify({ state, version }) });

  it("starts with the default context and exclusion words", () => {
    const { newsContext } = createPreferencesStore({ storage: createMemoryStorage() }).getState();
    expect(newsContext.company.requireAny).toContain("Colombia");
    expect(newsContext.sector.requireAny).toContain("Colombia");
    for (const group of NEWS_TERM_GROUPS) expect(newsContext[group.id].excludeAny).toEqual(DEFAULT_NEWS_CONTEXT[group.id].excludeAny);
  });

  it("gives data saved before the context rules existed the default rules, keeping its terms", async () => {
    const store = createPreferencesStore({ storage: persisted({ newsTermGroups: { sector: ["kraft"] } }, 2) });
    await store.persist.rehydrate();
    expect(store.getState().newsContext.company.requireAny).toContain("Yumbo");
    expect(store.getState().newsTermGroups.sector).toEqual(["kraft"]);
  });

  it("edits one group's words, cleaned and without duplicates, and persists them", async () => {
    const storage = createMemoryStorage();
    createPreferencesStore({ storage }).getState().setNewsContext("company", { requireAny: [" Colombia ", "Colombia", ""], excludeAny: ["fútbol"] });
    const fresh = createPreferencesStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().newsContext.company).toEqual({ requireAny: ["Colombia"], excludeAny: ["fútbol"] });
    expect(fresh.getState().newsContext.sector.excludeAny.length).toBeGreaterThan(0);
  });

  it("builds the matcher groups from the saved terms and words", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage() });
    store.getState().setNewsContext("company", { requireAny: ["Yumbo"], excludeAny: ["fútbol"] });
    const [company] = buildNewsTermGroups(store.getState());
    expect(company.excludeAny).toEqual(["fútbol"]);
    expect(company.terms).toContainEqual({ term: "Smurfit Westrock", requireAny: ["Yumbo"] });
    expect(company.terms).toContain("Cartones América");
  });

  it("restores the default words on reset", () => {
    const store = createPreferencesStore({ storage: createMemoryStorage() });
    store.getState().setNewsContext("company", { requireAny: [], excludeAny: [] });
    store.getState().reset();
    expect(store.getState().newsContext.company.requireAny).toContain("Colombia");
  });
});
