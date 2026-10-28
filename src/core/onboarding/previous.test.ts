import { describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { buildPreviousProfile } from "./previous";
import { previousProfileSchema } from "./schemas";

describe("buildPreviousProfile", () => {
  it("summarizes the profile for the AI and passes the strict schema", () => {
    const previous = buildPreviousProfile({ ...TEST_COMPANY, sector: "Metalmecánica" });
    expect(previousProfileSchema.safeParse(previous).success).toBe(true);
    expect(previous).toMatchObject({
      name: "Empresa Ejemplo",
      sector: "Metalmecánica",
      competitors: ["Competidora Uno", "Competidora Dos", "Competidora Tres"],
      regulationKeywords: TEST_COMPANY.regulationKeywords,
      goals: { target: "Exportar a dos países en tres años." },
    });
    expect(previous.newsTerms?.sector).toEqual(["piezas metálicas", "industria metalmecánica"]);
  });

  it("never sends a NIT", () => {
    expect(JSON.stringify(buildPreviousProfile(TEST_COMPANY))).not.toContain("9000000");
  });

  it("leaves out what the company does not have yet", () => {
    const bare = buildPreviousProfile({
      ...TEST_COMPANY,
      activity: "",
      competitors: [],
      regulationKeywords: [],
      goals: { currentSituation: "", target: "", priorities: [] },
      newsGroups: { company: { terms: [], contextTerms: "all" }, sector: { terms: [], contextTerms: "all" }, regulation: { terms: [], contextTerms: "all" }, operations: { terms: [], contextTerms: "all" } },
    });
    expect(bare).toEqual({ name: "Empresa Ejemplo" });
  });
});
