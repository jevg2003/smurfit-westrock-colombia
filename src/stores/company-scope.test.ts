import { describe, expect, it } from "vitest";
import { createAlertsStore } from "./alerts.store";
import { browserStorage } from "./browser-storage";
import { bindStoreToCompany, scopedKey } from "./company-scope";
import { createDecisionsStore } from "./decisions.store";
import { createMemoryStorage, makeSignal } from "./test-utils";

describe("scopedKey", () => {
  it("namespaces a store name by company", () => {
    expect(scopedKey("acme", "alerts")).toBe("swc:acme:alerts:v1");
  });
});

describe("bindStoreToCompany", () => {
  it("keeps the data of each company apart when switching", async () => {
    const storage = createMemoryStorage();
    const store = createAlertsStore({ storage, companyId: "a" });

    await bindStoreToCompany(store, "a", "alerts");
    store.getState().createFromSignal(makeSignal("s1"));
    expect(storage.data.has("swc:a:alerts:v1")).toBe(true);

    await bindStoreToCompany(store, "b", "alerts");
    expect(store.getState().alerts).toEqual([]);
    store.getState().createFromSignal(makeSignal("s2"));
    expect(storage.data.has("swc:b:alerts:v1")).toBe(true);

    await bindStoreToCompany(store, "a", "alerts");
    expect(store.getState().alerts.map((alert) => alert.signalId)).toEqual(["s1"]);
  });

  it("does not overwrite saved data of the target company before reading it", async () => {
    const storage = createMemoryStorage();
    const first = createDecisionsStore({ storage, companyId: "a" });
    first.getState().create({ title: "Comprar", question: "¿Compramos?", pestelFactors: ["economic"] });

    const store = createDecisionsStore({ storage, companyId: "b" });
    await bindStoreToCompany(store, "a", "decisions");
    expect(store.getState().decisions).toHaveLength(1);
  });
});

describe("browserStorage", () => {
  it("swallows a failing write so the in-memory state keeps working", () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    const storage = browserStorage(failing);
    expect(() => storage?.setItem("k", { state: {}, version: 1 })).not.toThrow();
  });
});
