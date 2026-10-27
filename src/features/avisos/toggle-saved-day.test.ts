import { describe, expect, it } from "vitest";
import { trmDaySignalId } from "@/core/rules/trm-daily-move";
import { createAlertsStore } from "@/stores/alerts.store";
import { createFakeClock, createMemoryStorage, makeSignal } from "@/stores/test-utils";
import { toggleSavedDay } from "./toggle-saved-day";

function setup() {
  const clock = createFakeClock();
  const store = createAlertsStore({ storage: createMemoryStorage(), clock });
  return { clock, store };
}

describe("toggleSavedDay", () => {
  it("saves an unknown day as a reviewed alert", () => {
    const { clock, store } = setup();
    toggleSavedDay(store, "2026-10-01", clock);
    expect(store.getState().alerts).toHaveLength(1);
    expect(store.getState().alerts[0]).toMatchObject({ signalId: trmDaySignalId("2026-10-01"), state: "reviewed" });
  });

  it("un-saves a day that is already saved", () => {
    const { clock, store } = setup();
    toggleSavedDay(store, "2026-10-01", clock);
    toggleSavedDay(store, "2026-10-01", clock);
    expect(store.getState().alerts).toEqual([]);
  });

  it("saves a dismissed day again as a fresh reviewed alert", () => {
    const { clock, store } = setup();
    const signalId = trmDaySignalId("2026-10-01");
    store.getState().createFromSignal(makeSignal(signalId));
    store.getState().dismiss(signalId, "not relevant");
    toggleSavedDay(store, "2026-10-01", clock);
    expect(store.getState().alerts).toHaveLength(1);
    expect(store.getState().alerts[0].state).toBe("reviewed");
  });
});
