import { describe, expect, it } from "vitest";
import { createAlertsStore } from "./alerts.store";
import { LEGACY_ALERTS_KEY, migrateLegacyAlerts } from "./legacy-migration";
import { createFakeClock, createMemoryStorage } from "./test-utils";

const DATES = ["2026-10-01T00:00:00.000", "2026-10-02T00:00:00.000"];

function setup(legacy?: string) {
  const storage = createMemoryStorage(legacy === undefined ? {} : { [LEGACY_ALERTS_KEY]: legacy });
  const clock = createFakeClock();
  const store = createAlertsStore({ storage, clock });
  return { storage, clock, store };
}

describe("migrateLegacyAlerts", () => {
  it("imports saved TRM days as reviewed alerts and removes the old key", () => {
    const { storage, store, clock } = setup(JSON.stringify(DATES));
    const result = migrateLegacyAlerts({ storage, alerts: store, clock });
    expect(result).toEqual({ imported: 2 });
    expect(store.getState().alerts.map((alert) => alert.signalId)).toEqual([
      "trm.daily-move.v1:trm:2026-10-01T00:00:00.000",
      "trm.daily-move.v1:trm:2026-10-02T00:00:00.000",
    ]);
    expect(store.getState().alerts.every((alert) => alert.state === "reviewed")).toBe(true);
    expect(storage.data.has(LEGACY_ALERTS_KEY)).toBe(false);
  });

  it("is idempotent", () => {
    const { storage, store, clock } = setup(JSON.stringify(DATES));
    migrateLegacyAlerts({ storage, alerts: store, clock });
    const second = migrateLegacyAlerts({ storage, alerts: store, clock });
    expect(second).toEqual({ imported: 0 });
    expect(store.getState().alerts).toHaveLength(2);
  });

  it("does not duplicate alerts that already exist", () => {
    const { storage, store, clock } = setup(JSON.stringify(DATES));
    migrateLegacyAlerts({ storage, alerts: store, clock });
    storage.setItem(LEGACY_ALERTS_KEY, JSON.stringify(DATES));
    expect(migrateLegacyAlerts({ storage, alerts: store, clock })).toEqual({ imported: 0 });
    expect(store.getState().alerts).toHaveLength(2);
  });

  it("does nothing when there is no legacy key", () => {
    const { storage, store, clock } = setup();
    expect(migrateLegacyAlerts({ storage, alerts: store, clock })).toEqual({ imported: 0 });
    expect(store.getState().alerts).toEqual([]);
  });

  it("discards corrupt legacy data without breaking", () => {
    const { storage, store, clock } = setup("{broken");
    expect(migrateLegacyAlerts({ storage, alerts: store, clock })).toEqual({ imported: 0 });
    expect(storage.data.has(LEGACY_ALERTS_KEY)).toBe(false);
  });

  it("ignores non-string entries", () => {
    const { storage, store, clock } = setup(JSON.stringify([DATES[0], 42, null]));
    expect(migrateLegacyAlerts({ storage, alerts: store, clock })).toEqual({ imported: 1 });
  });
});
