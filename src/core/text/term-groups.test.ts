import { describe, expect, it } from "vitest";
import { matchTermGroups } from "./match";
import { buildTermGroup } from "./term-groups";

const DEFINITION = { id: "company", label: "Empresa", terms: ["Smurfit Westrock", "Cartones América"], contextTerms: ["smurfit westrock"] };

describe("buildTermGroup", () => {
  it("adds the context words only to the context terms and the exclusions to the group", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: ["Colombia"], excludeAny: ["fútbol"] });
    expect(group.terms).toEqual([{ term: "Smurfit Westrock", requireAny: ["Colombia"] }, "Cartones América"]);
    expect(group.excludeAny).toEqual(["fútbol"]);
  });

  it("matches the Colombian operation and drops the Spanish football club", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: ["Colombia", "Yumbo"], excludeAny: ["fútbol", "Liga"] });
    expect(matchTermGroups("Smurfit Westrock invierte en Yumbo", [group])).toHaveLength(1);
    expect(matchTermGroups("CD Iberfurgo, patrocinado por Smurfit Westrock", [group])).toEqual([]);
    expect(matchTermGroups("Cartones América vende más", [group])).toHaveLength(1);
  });

  it("leaves a context term plain when the user clears every context word", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: [" "], excludeAny: [] });
    expect(group.terms).toEqual(["Smurfit Westrock", "Cartones América"]);
    expect(group.excludeAny).toBeUndefined();
  });
});
