import { describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { COMPANIES_STORAGE_KEY, createCompaniesStore, selectActiveCompany } from "./companies.store";
import { createFakeClock, createMemoryStorage } from "./test-utils";

const other = { ...TEST_COMPANY, id: "otra", name: "Otra Empresa" };

describe("companies store", () => {
  it("starts empty with no active company", () => {
    const state = createCompaniesStore({ storage: createMemoryStorage() }).getState();
    expect(state.companies).toEqual([]);
    expect(state.activeCompanyId).toBeNull();
  });

  it("adds a company without activating it, and replaces one with the same id", () => {
    const store = createCompaniesStore({ storage: createMemoryStorage() });
    store.getState().add(TEST_COMPANY);
    expect(store.getState().activeCompanyId).toBeNull();
    store.getState().add({ ...TEST_COMPANY, name: "Renombrada" });
    expect(store.getState().companies).toHaveLength(1);
    expect(store.getState().companies[0].name).toBe("Renombrada");
  });

  it("activates only an existing company", () => {
    const store = createCompaniesStore({ storage: createMemoryStorage() });
    store.getState().add(TEST_COMPANY);
    store.getState().setActive("no-existe");
    expect(store.getState().activeCompanyId).toBeNull();
    store.getState().setActive(TEST_COMPANY.id);
    expect(selectActiveCompany(store.getState())?.id).toBe(TEST_COMPANY.id);
    store.getState().clearActive();
    expect(selectActiveCompany(store.getState())).toBeUndefined();
  });

  it("updates a profile and stamps updatedAt without touching id or createdAt", () => {
    const clock = createFakeClock("2026-11-01T10:00:00.000Z");
    const store = createCompaniesStore({ storage: createMemoryStorage(), clock });
    store.getState().add(TEST_COMPANY);
    store.getState().update(TEST_COMPANY.id, { name: "Nuevo nombre" });
    const [saved] = store.getState().companies;
    expect(saved.name).toBe("Nuevo nombre");
    expect(saved.updatedAt).toBe("2026-11-01T10:00:00.000Z");
    expect(saved.createdAt).toBe(TEST_COMPANY.createdAt);
  });

  it("clears the active company when it is removed", () => {
    const store = createCompaniesStore({ storage: createMemoryStorage() });
    store.getState().add(TEST_COMPANY);
    store.getState().add(other);
    store.getState().setActive(other.id);
    store.getState().remove(other.id);
    expect(store.getState().activeCompanyId).toBeNull();
    expect(store.getState().companies.map((company) => company.id)).toEqual([TEST_COMPANY.id]);
  });

  it("persists under swc:companies:v1 and restores the list and the active company", async () => {
    const storage = createMemoryStorage();
    const store = createCompaniesStore({ storage });
    store.getState().add(TEST_COMPANY);
    store.getState().setActive(TEST_COMPANY.id);
    expect(COMPANIES_STORAGE_KEY).toBe("swc:companies:v1");
    expect(storage.data.has(COMPANIES_STORAGE_KEY)).toBe(true);

    const fresh = createCompaniesStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().activeCompanyId).toBe(TEST_COMPANY.id);
    expect(fresh.getState().companies[0].name).toBe(TEST_COMPANY.name);
  });

  it("drops invalid profiles and an active id that no longer exists", async () => {
    const storage = createMemoryStorage({
      [COMPANIES_STORAGE_KEY]: JSON.stringify({ state: { companies: [{ id: 1 }, null, TEST_COMPANY], activeCompanyId: "fantasma" }, version: 1 }),
    });
    const store = createCompaniesStore({ storage });
    await store.persist.rehydrate();
    expect(store.getState().companies.map((company) => company.id)).toEqual([TEST_COMPANY.id]);
    expect(store.getState().activeCompanyId).toBeNull();
  });
});
