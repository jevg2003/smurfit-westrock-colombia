import { describe, expect, it } from "vitest";
import { NEWS_TERM_GROUPS } from "@/content/config/empresa";
import { createPreferencesStore } from "./preferences.store";
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
