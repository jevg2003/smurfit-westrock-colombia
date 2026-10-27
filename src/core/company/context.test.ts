import { describe, expect, it } from "vitest";
import { buildCompanyContext, buildProfileTermGroups, companyContextSchema } from "./context";
import { TEST_COMPANY } from "./test-fixtures";

describe("buildProfileTermGroups", () => {
  it("gates the terms that need context with the Colombian words and leaves the others open", () => {
    const groups = buildProfileTermGroups(TEST_COMPANY);
    expect(groups.map((group) => group.id)).toEqual(["company", "sector", "regulation", "operations"]);
    expect(groups[0].terms).toContainEqual({ term: "Empresa Ejemplo", requireAny: TEST_COMPANY.colombiaContextWords });
    expect(groups[0].terms).toContain("Competidora Uno");
    expect(groups[1].terms[0]).toEqual({ term: "piezas metálicas", requireAny: TEST_COMPANY.colombiaContextWords });
    expect(groups[1].excludeAny).toEqual(TEST_COMPANY.excludeWords);
  });
});

describe("buildCompanyContext", () => {
  it("produces a context the server schema accepts", () => {
    const context = buildCompanyContext(TEST_COMPANY);
    expect(companyContextSchema.safeParse(context).success).toBe(true);
    expect(context.nit).toBe(TEST_COMPANY.nit);
    expect(context.regulation.include).toEqual(TEST_COMPANY.regulationKeywords);
  });

  it("sends the sector when the company has one and omits it otherwise", () => {
    const withSector = buildCompanyContext({ ...TEST_COMPANY, sector: "Metalmecánica" });
    expect(withSector.sector).toBe("Metalmecánica");
    expect(companyContextSchema.safeParse(withSector).success).toBe(true);
    expect("sector" in buildCompanyContext(TEST_COMPANY)).toBe(false);
    expect(companyContextSchema.safeParse({ ...withSector, sector: "x".repeat(121) }).success).toBe(false);
  });

  it("omits the NIT when the company has none", () => {
    const context = buildCompanyContext({ ...TEST_COMPANY, nit: undefined });
    expect("nit" in context).toBe(false);
    expect(companyContextSchema.safeParse(context).success).toBe(true);
  });
});

describe("companyContextSchema", () => {
  it("rejects unbounded lists", () => {
    const context = buildCompanyContext(TEST_COMPANY);
    const many = Array.from({ length: 30 }, (_, index) => ({ name: `C${index}` }));
    expect(companyContextSchema.safeParse({ ...context, competitors: many }).success).toBe(false);
  });
});
