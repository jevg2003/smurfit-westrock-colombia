import { describe, expect, it } from "vitest";
import { groupByDay } from "./group-by-day";

const NOW = new Date("2026-10-27T15:00:00.000Z"); // Tuesday, Bogota time 10:00

const at = (iso: string) => ({ at: iso });

describe("groupByDay", () => {
  it("names Hoy, Ayer and Esta semana, then falls back to the date", () => {
    const groups = groupByDay(
      [at("2026-10-27T13:00:00.000Z"), at("2026-10-26T20:00:00.000Z"), at("2026-10-23T20:00:00.000Z"), at("2026-09-01T20:00:00.000Z")],
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual(["Hoy", "Ayer", "Esta semana", "1 de sept de 2026"]);
  });

  it("groups by Bogota calendar day, not by UTC", () => {
    // 2026-10-28T03:00Z is still the 27th at 22:00 in Bogota.
    const groups = groupByDay([at("2026-10-28T03:00:00.000Z"), at("2026-10-27T13:00:00.000Z")], NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it("keeps the order of the items inside a group and orders groups newest first", () => {
    const a = at("2026-10-26T10:00:00.000Z");
    const b = at("2026-10-27T10:00:00.000Z");
    const c = at("2026-10-26T18:00:00.000Z");
    const groups = groupByDay([a, b, c], NOW);

    expect(groups.map((group) => group.label)).toEqual(["Hoy", "Ayer"]);
    expect(groups[1].items).toEqual([a, c]);
  });

  it("puts items without a valid date in a final group", () => {
    const groups = groupByDay([at("2026-10-27T13:00:00.000Z"), at("nope")], NOW);

    expect(groups.map((group) => group.label)).toEqual(["Hoy", "Sin fecha"]);
  });
});
