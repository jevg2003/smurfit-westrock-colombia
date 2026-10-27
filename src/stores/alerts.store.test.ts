import { describe, expect, it } from "vitest";
import { MAX_ALERTS, createAlertsStore } from "./alerts.store";
import { UNSCOPED_COMPANY, scopedKey } from "./company-scope";
import { createFakeClock, createMemoryStorage, makeSignal } from "./test-utils";

const ALERTS_STORAGE_KEY = scopedKey(UNSCOPED_COMPANY, "alerts");

function setup() {
  const storage = createMemoryStorage();
  const clock = createFakeClock();
  const store = createAlertsStore({ storage, clock });
  return { storage, clock, store };
}

describe("alerts store", () => {
  it("creates a new alert from a signal snapshot", () => {
    const { store } = setup();
    const signal = makeSignal("s1");
    const alert = store.getState().createFromSignal(signal);
    expect(alert).toMatchObject({
      signalId: "s1",
      state: "new",
      createdAt: "2026-10-20T12:00:00.000Z",
      updatedAt: "2026-10-20T12:00:00.000Z",
      signalSnapshot: signal,
    });
    expect(store.getState().alerts).toHaveLength(1);
  });

  it("does not duplicate an alert for the same signal", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    store.getState().createFromSignal(makeSignal("s1"));
    expect(store.getState().alerts).toHaveLength(1);
  });

  it("moves new to reviewed with an optional note and a fresh updatedAt", () => {
    const { store, clock } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    clock.set("2026-10-21T08:00:00.000Z");
    const result = store.getState().review("s1");
    expect(result.ok).toBe(true);
    expect(store.getState().alerts[0]).toMatchObject({
      state: "reviewed",
      createdAt: "2026-10-20T12:00:00.000Z",
      updatedAt: "2026-10-21T08:00:00.000Z",
    });
    expect(store.getState().alerts[0].note).toBeUndefined();
  });

  it("stores the note when reviewing with one", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    store.getState().review("s1", "  checked with finance  ");
    expect(store.getState().alerts[0].note).toBe("checked with finance");
  });

  it("rejects dismissing without a note and leaves the alert untouched", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    for (const note of [undefined, "", "   "]) {
      const result = store.getState().dismiss("s1", note);
      expect(result).toMatchObject({ ok: false, error: { kind: "note_required" } });
    }
    expect(store.getState().alerts[0].state).toBe("new");
  });

  it("dismisses with a note", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    const result = store.getState().dismiss("s1", "not relevant for us");
    expect(result.ok).toBe(true);
    expect(store.getState().alerts[0]).toMatchObject({ state: "dismissed", note: "not relevant for us" });
  });

  it("allows reviewed to dismissed but nothing out of dismissed", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    store.getState().review("s1");
    expect(store.getState().dismiss("s1", "later irrelevant").ok).toBe(true);
    expect(store.getState().review("s1")).toMatchObject({ ok: false, error: { kind: "invalid_transition" } });
  });

  it("reports an unknown signal", () => {
    const { store } = setup();
    expect(store.getState().review("missing")).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("removes an alert", () => {
    const { store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    store.getState().remove("s1");
    expect(store.getState().alerts).toEqual([]);
  });

  it("prunes dismissed alerts first when the cap is reached", () => {
    const { store } = setup();
    for (let index = 0; index < MAX_ALERTS; index += 1) store.getState().createFromSignal(makeSignal(`s${index}`));
    store.getState().dismiss("s3", "not relevant");
    store.getState().dismiss("s7", "not relevant");
    store.getState().createFromSignal(makeSignal("fresh"));
    const ids = store.getState().alerts.map((alert) => alert.signalId);
    expect(ids).toHaveLength(MAX_ALERTS);
    expect(ids).not.toContain("s3");
    expect(ids).toContain("s7");
    expect(ids).toContain("fresh");
  });

  it("prunes the oldest reviewed alert when nothing is dismissed", () => {
    const { store } = setup();
    for (let index = 0; index < MAX_ALERTS; index += 1) store.getState().createFromSignal(makeSignal(`s${index}`));
    store.getState().review("s5");
    store.getState().review("s9");
    store.getState().createFromSignal(makeSignal("fresh"));
    const ids = store.getState().alerts.map((alert) => alert.signalId);
    expect(ids).toHaveLength(MAX_ALERTS);
    expect(ids).not.toContain("s5");
    expect(ids).toContain("s9");
  });

  it("never drops new alerts, even above the cap", () => {
    const { store } = setup();
    for (let index = 0; index < MAX_ALERTS + 2; index += 1) store.getState().createFromSignal(makeSignal(`s${index}`));
    const ids = store.getState().alerts.map((alert) => alert.signalId);
    expect(ids).toHaveLength(MAX_ALERTS + 2);
    expect(ids).toContain("s0");
  });

  it("persists under a versioned key and rehydrates on demand", async () => {
    const { storage, clock, store } = setup();
    store.getState().createFromSignal(makeSignal("s1"));
    expect(ALERTS_STORAGE_KEY).toBe("swc:_:alerts:v1");
    expect(JSON.parse(storage.data.get(ALERTS_STORAGE_KEY)!).version).toBe(1);

    const fresh = createAlertsStore({ storage, clock });
    expect(fresh.getState().alerts).toEqual([]); // skipHydration
    await fresh.persist.rehydrate();
    expect(fresh.getState().alerts.map((alert) => alert.signalId)).toEqual(["s1"]);
  });

  it("starts empty when the persisted JSON is corrupt", async () => {
    const storage = createMemoryStorage({ [ALERTS_STORAGE_KEY]: "{not json" });
    const store = createAlertsStore({ storage, clock: createFakeClock() });
    await store.persist.rehydrate();
    expect(store.getState().alerts).toEqual([]);
  });
});
