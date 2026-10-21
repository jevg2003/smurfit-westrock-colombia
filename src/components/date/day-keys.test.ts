import { describe, expect, it } from "vitest";
import { dateToKey, keyToDate } from "./day-keys";
import { datePresets, matchRangePreset, rangePresets } from "./presets";

describe("day keys", () => {
  it("round-trips a calendar day without shifting it across zones", () => {
    expect(dateToKey(keyToDate("2026-03-01"))).toBe("2026-03-01");
    expect(keyToDate("2026-03-01").getDate()).toBe(1);
  });
});

describe("datePresets", () => {
  it("offers past shortcuts counted from the given Bogota day", () => {
    const presets = datePresets("2026-10-20", "past");
    expect(presets.map((preset) => [preset.label, preset.value])).toEqual([
      ["Hoy", "2026-10-20"],
      ["Ayer", "2026-10-19"],
      ["Hace una semana", "2026-10-13"],
      ["Hace un mes", "2026-09-20"],
      ["Hace un año", "2025-10-20"],
    ]);
  });

  it("offers future shortcuts for review dates", () => {
    const presets = datePresets("2026-10-20", "future");
    expect(presets.map((preset) => [preset.label, preset.value])).toEqual([
      ["Hoy", "2026-10-20"],
      ["Mañana", "2026-10-21"],
      ["En una semana", "2026-10-27"],
      ["En un mes", "2026-11-20"],
      ["En un año", "2027-10-20"],
    ]);
  });
});

describe("rangePresets", () => {
  const byId = (today: string) => Object.fromEntries(rangePresets(today).map((preset) => [preset.id, preset]));

  it("last week is the previous Monday to Sunday in Bogota", () => {
    // 2026-10-20 is a Tuesday: the current week started Monday the 19th.
    expect(byId("2026-10-20")["last-week"]?.range).toEqual({ fromDate: "2026-10-12", toDate: "2026-10-18" });
    // On a Monday and on a Sunday the answer is still the previous full week.
    expect(byId("2026-10-19")["last-week"]?.range).toEqual({ fromDate: "2026-10-12", toDate: "2026-10-18" });
    expect(byId("2026-10-25")["last-week"]?.range).toEqual({ fromDate: "2026-10-12", toDate: "2026-10-18" });
  });

  it("covers the last 7 days, month and 12 months ending today", () => {
    const presets = byId("2026-10-20");
    expect(presets["last-7"]?.range).toEqual({ fromDate: "2026-10-14", toDate: "2026-10-20" });
    expect(presets["last-month"]?.range).toEqual({ fromDate: "2026-09-20", toDate: "2026-10-20" });
    expect(presets["last-12-months"]?.range).toEqual({ fromDate: "2025-10-20", toDate: "2026-10-20" });
  });

  it("recognizes which preset a range came from", () => {
    expect(matchRangePreset({ fromDate: "2026-10-12", toDate: "2026-10-18" }, "2026-10-20")).toBe("last-week");
    expect(matchRangePreset({ fromDate: "2026-10-01", toDate: "2026-10-02" }, "2026-10-20")).toBeUndefined();
  });
});
