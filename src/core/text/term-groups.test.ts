import { describe, expect, it } from "vitest";
import { matchTermGroups } from "./match";
import { buildTermGroup } from "./term-groups";

const DEFINITION = { id: "company", label: "Empresa", terms: ["Empresa Ejemplo", "Competidora Uno"], contextTerms: ["empresa ejemplo"] };

describe("buildTermGroup", () => {
  it("adds the context words only to the context terms and the exclusions to the group", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: ["Colombia"], excludeAny: ["fútbol"] });
    expect(group.terms).toEqual([{ term: "Empresa Ejemplo", requireAny: ["Colombia"] }, "Competidora Uno"]);
    expect(group.excludeAny).toEqual(["fútbol"]);
  });

  it("matches the Colombian operation and drops the Spanish football club", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: ["Colombia", "Itagüí"], excludeAny: ["fútbol", "Liga"] });
    expect(matchTermGroups("Empresa Ejemplo invierte en Itagüí", [group])).toHaveLength(1);
    expect(matchTermGroups("CD Iberfurgo, patrocinado por Empresa Ejemplo", [group])).toEqual([]);
    expect(matchTermGroups("Competidora Uno vende más", [group])).toHaveLength(1);
  });

  it("leaves a context term plain when the user clears every context word", () => {
    const group = buildTermGroup(DEFINITION, { requireAny: [" "], excludeAny: [] });
    expect(group.terms).toEqual(["Empresa Ejemplo", "Competidora Uno"]);
    expect(group.excludeAny).toBeUndefined();
  });

  it("gates every term of the group when the context applies to all of them", () => {
    const group = buildTermGroup({ id: "sector", label: "Sector", terms: ["celulosa", "alambre galvanizado"], contextTerms: "all" }, { requireAny: ["Colombia"], excludeAny: [] });
    expect(group.terms).toEqual([
      { term: "celulosa", requireAny: ["Colombia"] },
      { term: "alambre galvanizado", requireAny: ["Colombia"] },
    ]);
    expect(matchTermGroups("Celulosa Argentina pierde", [group])).toEqual([]);
    expect(matchTermGroups("Celulosa sube en Colombia", [group])).toHaveLength(1);
  });
});
