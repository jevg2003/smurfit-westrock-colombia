import { describe, expect, it } from "vitest";
import {
  bogotaDateKey,
  bogotaStartOfDay,
  daysBetweenKeys,
  daysUntil,
  floatingToBogotaIso,
} from "./bogota";

describe("bogotaDateKey", () => {
  it("uses the Bogota calendar day, not the UTC day", () => {
    expect(bogotaDateKey(new Date("2026-10-20T04:59:59.999Z"))).toBe("2026-10-19");
    expect(bogotaDateKey(new Date("2026-10-20T05:00:00.000Z"))).toBe("2026-10-20");
  });

  it("accepts ISO strings", () => {
    expect(bogotaDateKey("2026-12-31T00:00:00.000-05:00")).toBe("2026-12-31");
  });
});

describe("daysBetweenKeys / daysUntil", () => {
  it("counts whole calendar days", () => {
    expect(daysBetweenKeys("2026-10-20", "2026-12-31")).toBe(72);
    expect(daysBetweenKeys("2026-12-31", "2026-10-20")).toBe(-72);
    expect(daysBetweenKeys("2026-10-20", "2026-10-20")).toBe(0);
  });

  it("counts days from now to a target in Bogota time", () => {
    const now = new Date("2026-10-20T03:00:00.000Z"); // still 2026-10-19 in Bogota
    expect(daysUntil("2026-12-31T00:00:00.000-05:00", now)).toBe(73);
  });
});

describe("bogotaStartOfDay", () => {
  it("returns midnight Bogota as a UTC instant", () => {
    expect(bogotaStartOfDay("2026-10-19").toISOString()).toBe("2026-10-19T05:00:00.000Z");
  });
});

describe("floatingToBogotaIso", () => {
  it("anchors floating source timestamps to Bogota", () => {
    expect(floatingToBogotaIso("2026-01-27T00:00:00.000")).toBe("2026-01-27T00:00:00.000-05:00");
    expect(floatingToBogotaIso("2026-01-27")).toBe("2026-01-27T00:00:00.000-05:00");
  });

  it("returns null for unusable values", () => {
    expect(floatingToBogotaIso("")).toBeNull();
    expect(floatingToBogotaIso("not a date")).toBeNull();
    expect(floatingToBogotaIso("2026-13-45T00:00:00.000")).toBeNull();
  });
});
