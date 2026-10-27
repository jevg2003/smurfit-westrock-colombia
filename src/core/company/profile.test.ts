import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  createCompanyProfile,
  deriveNewsGroupDefinitions,
  hasNit,
  nitOf,
  searchTermsOf,
  watchedNits,
  withNitCompetitors,
} from "./profile";
import { TEST_COMPANY } from "./test-fixtures";

describe("hasNit", () => {
  it("is true only when the company has a NIT", () => {
    expect(hasNit(TEST_COMPANY)).toBe(true);
    expect(hasNit({ ...TEST_COMPANY, nit: undefined })).toBe(false);
  });
});

describe("nitOf", () => {
  it("keeps the digits of a formatted NIT and drops the verification digit", () => {
    expect(nitOf("900.123.456-7")).toBe("900123456");
    expect(nitOf(" 900123456 ")).toBe("900123456");
  });

  it("returns undefined for empty or non numeric input", () => {
    expect(nitOf("")).toBeUndefined();
    expect(nitOf("sin nit")).toBeUndefined();
  });
});

describe("watchedNits", () => {
  it("lists the company NIT first and then the competitors that have one", () => {
    const profile = { ...TEST_COMPANY, competitors: [{ name: "A", nit: "800000001" }, { name: "B" }, { name: "C", nit: "800000003" }] };
    expect(watchedNits(profile)).toEqual([TEST_COMPANY.nit, "800000001", "800000003"]);
  });

  it("is empty without NIT anywhere", () => {
    expect(watchedNits({ ...TEST_COMPANY, nit: undefined, competitors: [{ name: "B" }] })).toEqual([]);
  });
});

describe("withNitCompetitors", () => {
  it("keeps only the competitors that can be matched by NIT", () => {
    const result = withNitCompetitors({ ...TEST_COMPANY, competitors: [{ name: "A", nit: "800000001" }, { name: "B" }] });
    expect(result).toEqual([{ name: "A", nit: "800000001" }]);
  });
});

describe("deriveNewsGroupDefinitions", () => {
  it("puts the company and competitor names in the company group", () => {
    const groups = deriveNewsGroupDefinitions(TEST_COMPANY);
    const company = groups.find((group) => group.id === "company");
    expect(company?.terms).toEqual([TEST_COMPANY.name, ...TEST_COMPANY.competitors.map((c) => c.name)]);
  });

  it("returns the four fixed groups in order", () => {
    expect(deriveNewsGroupDefinitions(TEST_COMPANY).map((group) => group.id)).toEqual(["company", "sector", "regulation", "operations"]);
  });
});

describe("searchTermsOf", () => {
  it("flattens the terms of every group without repeats", () => {
    const profile = {
      ...TEST_COMPANY,
      newsGroups: {
        ...TEST_COMPANY.newsGroups,
        sector: { terms: ["acero", "Acero", "hierro"], contextTerms: "all" as const },
      },
    };
    const terms = searchTermsOf(profile);
    expect(terms.filter((term) => term.toLowerCase() === "acero")).toHaveLength(1);
    expect(terms).toContain(TEST_COMPANY.name);
  });
});

describe("createCompanyProfile", () => {
  it("fills the defaults and stamps id and timestamps", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");
    const profile = createCompanyProfile({ name: "  Fábrica Ejemplo  ", nit: "901.000.111-2" }, { id: "abc", now });
    expect(profile.id).toBe("abc");
    expect(profile.name).toBe("Fábrica Ejemplo");
    expect(profile.nit).toBe("901000111");
    expect(profile.createdAt).toBe(now.toISOString());
    expect(profile.updatedAt).toBe(now.toISOString());
    expect(profile.thresholds.trmDailyMovePct).toBeGreaterThan(0);
    expect(profile.newsGroups.company.terms).toContain("Fábrica Ejemplo");
    expect(companyProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("builds a valid profile with only a name", () => {
    const profile = createCompanyProfile({ name: "Solo Nombre" }, { id: "x", now: new Date("2026-10-27T00:00:00.000Z") });
    expect(profile.nit).toBeUndefined();
    expect(profile.competitors).toEqual([]);
  });
});

describe("companyProfileSchema", () => {
  it("accepts the fixture", () => {
    expect(companyProfileSchema.safeParse(TEST_COMPANY).success).toBe(true);
  });

  it("rejects an empty name and a malformed NIT", () => {
    expect(companyProfileSchema.safeParse({ ...TEST_COMPANY, name: " " }).success).toBe(false);
    expect(companyProfileSchema.safeParse({ ...TEST_COMPANY, nit: "12-ab" }).success).toBe(false);
  });

  it("rejects non positive thresholds", () => {
    const bad = { ...TEST_COMPANY, thresholds: { ...TEST_COMPANY.thresholds, trmDailyMovePct: 0 } };
    expect(companyProfileSchema.safeParse(bad).success).toBe(false);
  });
});
