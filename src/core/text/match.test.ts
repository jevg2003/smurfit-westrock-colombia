import { describe, expect, it } from "vitest";
import { matchTermGroups, normalizeText, type TermGroup } from "./match";

const GROUPS: TermGroup[] = [
  { id: "company", label: "Empresa", terms: ["Cartón de Colombia", "Smurfit Westrock"] },
  { id: "sector", label: "Sector", terms: ["papel", "bag-in-box"] },
];

describe("normalizeText", () => {
  it("lowercases, removes accents and turns punctuation into spaces", () => {
    expect(normalizeText("  CARTÓN, de-Colombia! ")).toBe("carton de colombia");
  });
});

describe("matchTermGroups", () => {
  it("matches ignoring case and accents", () => {
    expect(matchTermGroups("CARTON DE COLOMBIA invierte", GROUPS)).toEqual([{ groupId: "company", term: "Cartón de Colombia" }]);
  });

  it("respects word boundaries", () => {
    expect(matchTermGroups("El papeleo del Estado", GROUPS)).toEqual([]);
    expect(matchTermGroups("Sube el papel, baja el precio", GROUPS)).toEqual([{ groupId: "sector", term: "papel" }]);
  });

  it("matches hyphenated terms written with spaces", () => {
    expect(matchTermGroups("Nuevo bag in box en Cali", GROUPS)).toEqual([{ groupId: "sector", term: "bag-in-box" }]);
  });

  it("returns every group that matches, one entry per term, and ignores empty terms", () => {
    const groups = [...GROUPS, { id: "x", label: "X", terms: ["", "  "] }];
    const found = matchTermGroups("Smurfit Westrock vende papel", groups);
    expect(found.map((m) => m.groupId)).toEqual(["company", "sector"]);
  });
});

describe("context rules", () => {
  const groups: TermGroup[] = [
    {
      id: "company",
      label: "Empresa",
      terms: [{ term: "Smurfit Westrock", requireAny: ["Colombia", "Yumbo", "Medellín"] }, "Cartones América"],
      excludeAny: ["fútbol", "CD", "Liga"],
    },
  ];

  it("keeps plain string terms working next to context terms", () => {
    expect(matchTermGroups("Cartones América invierte", groups)).toEqual([{ groupId: "company", term: "Cartones América" }]);
  });

  it("matches a context term only when the title has one of its context words", () => {
    expect(matchTermGroups("Smurfit Westrock cierra planta en Málaga", groups)).toEqual([]);
    expect(matchTermGroups("Smurfit Westrock amplía planta en Yumbo", groups)).toEqual([{ groupId: "company", term: "Smurfit Westrock" }]);
    expect(matchTermGroups("Smurfit Westrock en MEDELLIN", groups)).toHaveLength(1);
  });

  it("respects word boundaries in context words", () => {
    expect(matchTermGroups("Smurfit Westrock y la colombiana Alpina", groups)).toEqual([]);
  });

  it("drops the whole group when the title has an excluded word", () => {
    expect(matchTermGroups("CD Iberfurgo Smurfit Westrock Colombia fútbol", groups)).toEqual([]);
    expect(matchTermGroups("Cartones América gana la Liga", groups)).toEqual([]);
    expect(matchTermGroups("Cartones América y el cdt", groups)).toHaveLength(1);
  });

  it("ignores empty context and exclusion words", () => {
    const lax: TermGroup[] = [{ id: "g", label: "G", terms: [{ term: "alfa", requireAny: [" "] }], excludeAny: ["", " "] }];
    expect(matchTermGroups("alfa", lax)).toEqual([{ groupId: "g", term: "alfa" }]);
  });

  it("waives the context words, but never the exclusions, when the context is assumed", () => {
    expect(matchTermGroups("Smurfit Westrock cierra planta en Málaga", groups, { contextAssumed: true })).toHaveLength(1);
    expect(matchTermGroups("Fútbol: Smurfit Westrock", groups, { contextAssumed: true })).toEqual([]);
  });
});
