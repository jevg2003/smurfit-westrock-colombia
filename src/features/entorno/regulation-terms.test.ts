import { describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { regulationQueryTerms } from "./regulation-terms";

describe("regulationQueryTerms", () => {
  it("adds the sector and regulation news terms to the regulation keywords, without repeats", () => {
    const { include, exclude } = regulationQueryTerms({
      ...TEST_COMPANY,
      regulationKeywords: ["arancel", "Piezas Metálicas"],
      regulationExcludeKeywords: ["nombramiento"],
    });
    expect(include).toEqual(expect.arrayContaining(["arancel", "arancel acero", "economía circular", "industria metalmecánica"]));
    expect(include.filter((term) => term.toLowerCase() === "piezas metálicas")).toHaveLength(1);
    expect(exclude).toEqual(["nombramiento"]);
  });

  it("stays within the 60 keywords the server accepts and drops context-word specs to their term", () => {
    const many = Array.from({ length: 60 }, (_, i) => `palabra ${i}`);
    expect(regulationQueryTerms({ ...TEST_COMPANY, regulationKeywords: many }).include).toHaveLength(60);
  });

  it("keeps an empty list when the company has nothing yet", () => {
    const empty = { ...TEST_COMPANY, regulationKeywords: [], newsGroups: { ...TEST_COMPANY.newsGroups, sector: { terms: [], contextTerms: "all" as const }, regulation: { terms: [], contextTerms: "all" as const } } };
    expect(regulationQueryTerms(empty).include).toEqual([]);
  });
});
