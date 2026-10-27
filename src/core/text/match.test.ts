import { describe, expect, it } from "vitest";
import { matchTermGroups, normalizeText, type TermGroup } from "./match";

const GROUPS: TermGroup[] = [
  { id: "company", label: "Empresa", terms: ["Empresa Ejemplo", "Empresa Ejemplo Global"] },
  { id: "sector", label: "Sector", terms: ["papel", "bag-in-box"] },
];

describe("normalizeText", () => {
  it("lowercases, removes accents and turns punctuation into spaces", () => {
    expect(normalizeText("  ACERÍA, de-Colombia! ")).toBe("aceria de colombia");
  });
});

describe("matchTermGroups", () => {
  it("matches ignoring case and accents", () => {
    expect(matchTermGroups("EMPRESA EJEMPLO invierte", GROUPS)).toEqual([{ groupId: "company", term: "Empresa Ejemplo" }]);
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
    const found = matchTermGroups("Empresa Ejemplo vende papel", groups);
    expect(found.map((m) => m.groupId)).toEqual(["company", "sector"]);
  });
});

describe("context rules", () => {
  const groups: TermGroup[] = [
    {
      id: "company",
      label: "Empresa",
      terms: [{ term: "Empresa Ejemplo", requireAny: ["Colombia", "Itagüí", "Medellín"] }, "Competidora Uno"],
      excludeAny: ["fútbol", "CD", "Liga"],
    },
  ];

  it("keeps plain string terms working next to context terms", () => {
    expect(matchTermGroups("Competidora Uno invierte", groups)).toEqual([{ groupId: "company", term: "Competidora Uno" }]);
  });

  it("matches a context term only when the title has one of its context words", () => {
    expect(matchTermGroups("Empresa Ejemplo cierra planta en Málaga", groups)).toEqual([]);
    expect(matchTermGroups("Empresa Ejemplo amplía planta en Itagüí", groups)).toEqual([{ groupId: "company", term: "Empresa Ejemplo" }]);
    expect(matchTermGroups("Empresa Ejemplo en MEDELLIN", groups)).toHaveLength(1);
  });

  it("respects word boundaries in context words", () => {
    expect(matchTermGroups("Empresa Ejemplo y la colombiana Alpina", groups)).toEqual([]);
  });

  it("drops the whole group when the title has an excluded word", () => {
    expect(matchTermGroups("CD Iberfurgo Empresa Ejemplo fútbol", groups)).toEqual([]);
    expect(matchTermGroups("Competidora Uno gana la Liga", groups)).toEqual([]);
    expect(matchTermGroups("Competidora Uno y el cdt", groups)).toHaveLength(1);
  });

  it("ignores empty context and exclusion words", () => {
    const lax: TermGroup[] = [{ id: "g", label: "G", terms: [{ term: "alfa", requireAny: [" "] }], excludeAny: ["", " "] }];
    expect(matchTermGroups("alfa", lax)).toEqual([{ groupId: "g", term: "alfa" }]);
  });

  it("waives the context words, but never the exclusions, when the context is assumed", () => {
    expect(matchTermGroups("Empresa Ejemplo cierra planta en Málaga", groups, { contextAssumed: true })).toHaveLength(1);
    expect(matchTermGroups("Fútbol: Empresa Ejemplo", groups, { contextAssumed: true })).toEqual([]);
  });
});
