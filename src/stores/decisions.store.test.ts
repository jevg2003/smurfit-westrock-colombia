import { describe, expect, it } from "vitest";
import { createDecisionsStore } from "./decisions.store";
import { createFakeClock, createMemoryStorage } from "./test-utils";

const DECISIONS_STORAGE_KEY = "swc:_:decisions:v1";

function setup() {
  const storage = createMemoryStorage();
  const clock = createFakeClock();
  let n = 0;
  const store = createDecisionsStore({ storage, clock, newId: () => `id-${++n}` });
  return { storage, clock, store };
}

const DRAFT = {
  title: "¿Cubrimos la exposición cambiaria?",
  question: "¿Cubrimos el próximo trimestre?",
  pestelFactors: ["economic" as const],
  options: [{ label: "Cubrir", pros: "Certeza", cons: "Costo" }, { label: "  ", pros: "", cons: "" }],
};

describe("decisions store", () => {
  it("creates an open decision, dropping blank options and giving ids", () => {
    const { store } = setup();
    const decision = store.getState().create(DRAFT);
    expect(decision).toMatchObject({
      id: "id-1",
      status: "open",
      rationale: "",
      linkedSignalIds: [],
      createdAt: "2026-10-20T12:00:00.000Z",
    });
    expect(decision.options).toEqual([{ id: "id-2", label: "Cubrir", pros: "Certeza", cons: "Costo" }]);
    expect(store.getState().decisions).toHaveLength(1);
  });

  it("updates fields and stamps updatedAt", () => {
    const { store, clock } = setup();
    const { id } = store.getState().create(DRAFT);
    clock.set("2026-10-21T12:00:00.000Z");
    store.getState().update(id, { title: "Nuevo título", linkedSignalIds: ["s1"] });
    expect(store.getState().decisions[0]).toMatchObject({
      title: "Nuevo título",
      linkedSignalIds: ["s1"],
      updatedAt: "2026-10-21T12:00:00.000Z",
    });
  });

  it("requires a rationale to mark decided and keeps the state on failure", () => {
    const { store } = setup();
    const { id } = store.getState().create(DRAFT);
    const failed = store.getState().setStatus(id, "decided", { rationale: " " });
    expect(failed).toMatchObject({ ok: false, error: { kind: "rationale_required" } });
    expect(store.getState().decisions[0].status).toBe("open");

    const done = store.getState().setStatus(id, "decided", { rationale: "Hay deuda en USD" });
    expect(done).toMatchObject({ ok: true, value: { status: "decided" } });
    expect(store.getState().decisions[0].rationale).toBe("Hay deuda en USD");
  });

  it("reports a missing decision", () => {
    const { store } = setup();
    expect(store.getState().setStatus("nope", "evaluating", {})).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("removes a decision", () => {
    const { store } = setup();
    const { id } = store.getState().create(DRAFT);
    store.getState().remove(id);
    expect(store.getState().decisions).toEqual([]);
  });

  it("persists under swc:_:decisions:v1 and rehydrates on demand", async () => {
    const { store, storage } = setup();
    store.getState().create(DRAFT);
    expect(DECISIONS_STORAGE_KEY).toBe("swc:_:decisions:v1");
    const saved = JSON.parse(storage.data.get(DECISIONS_STORAGE_KEY)!);
    expect(saved.state.decisions).toHaveLength(1);

    const second = createDecisionsStore({ storage, clock: createFakeClock() });
    expect(second.getState().decisions).toEqual([]); // skipHydration
    await second.persist.rehydrate();
    expect(second.getState().decisions).toHaveLength(1);
  });
});
