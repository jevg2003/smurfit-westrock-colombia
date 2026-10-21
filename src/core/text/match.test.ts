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
