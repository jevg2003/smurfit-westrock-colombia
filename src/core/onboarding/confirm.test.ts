import { describe, expect, it } from "vitest";
import { DEFAULT_REGULATION_KEYWORDS } from "@/core/company/defaults";
import { companyProfileSchema } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { buildConfirmValues, buildProfile, confirmFormSchema, profileToPatch, profileToSeed, updateProfile } from "./confirm";
import type { ProfilePatch } from "./schemas";

const now = new Date("2026-10-27T10:00:00.000Z");

describe("buildConfirmValues", () => {
  it("starts from the seed and the patch, with defaults where the AI said nothing", () => {
    const values = buildConfirmValues({ name: "Acme SAS", nit: "900123456", city: "Cali" }, { sector: "Alimentos", competitors: [{ name: "Alpina", nit: "860025900" }, { name: "Colanta" }] });
    expect(values).toMatchObject({ name: "Acme SAS", nit: "900123456", city: "Cali", sector: "Alimentos" });
    expect(values.competitors).toEqual([{ name: "Alpina", nit: "860025900" }, { name: "Colanta", nit: "" }]);
    expect(values.regulationKeywords).toEqual([...DEFAULT_REGULATION_KEYWORDS]);
    expect(values.newsGroups.company).toEqual(["Acme SAS", "Alpina", "Colanta"]);
  });

  it("uses the proposed groups and goals when they exist", () => {
    const patch: ProfilePatch = {
      newsGroups: {
        company: { terms: ["Acme"], contextTerms: [] },
        sector: { terms: ["lácteos"], contextTerms: "all" },
        regulation: { terms: ["INVIMA"], contextTerms: "all" },
        operations: { terms: [], contextTerms: "all" },
      },
      goals: { currentSituation: "Crece 5%", target: "Exportar", priorities: ["Costos"] },
    };
    const values = buildConfirmValues({ name: "Acme" }, patch);
    expect(values.newsGroups.sector).toEqual(["lácteos"]);
    expect(values).toMatchObject({ currentSituation: "Crece 5%", target: "Exportar", priorities: ["Costos"] });
  });
});

describe("confirmFormSchema", () => {
  const valid = buildConfirmValues({ name: "Acme" }, {});

  it("accepts the initial values", () => {
    expect(confirmFormSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and digits-only NITs when present", () => {
    expect(confirmFormSchema.safeParse({ ...valid, name: " " }).success).toBe(false);
    expect(confirmFormSchema.safeParse({ ...valid, nit: "900.123" }).success).toBe(false);
    expect(confirmFormSchema.safeParse({ ...valid, nit: "" }).success).toBe(true);
    expect(confirmFormSchema.safeParse({ ...valid, competitors: [{ name: "X", nit: "12" }] }).success).toBe(false);
  });
});

describe("buildProfile", () => {
  const patch: ProfilePatch = {
    newsGroups: {
      company: { terms: ["Acme"], contextTerms: [] },
      sector: { terms: ["lácteos"], contextTerms: "all" },
      regulation: { terms: [], contextTerms: "all" },
      operations: { terms: [], contextTerms: [] },
    },
    excludeWords: ["horóscopo"],
  };

  it("builds a profile that passes the schema, without an empty NIT", () => {
    const values = { ...buildConfirmValues({ name: "Acme", city: "Cali" }, patch), nit: "", sector: "Lácteos" };
    const profile = buildProfile(values, patch, { id: "acme", now });
    expect(companyProfileSchema.safeParse(profile).success).toBe(true);
    expect(profile).not.toHaveProperty("nit");
    expect(profile).toMatchObject({ id: "acme", sector: "Lácteos", city: "Cali", excludeWords: ["horóscopo"] });
  });

  it("keeps the context gating the AI proposed and always lists the company in its group", () => {
    const values = { ...buildConfirmValues({ name: "Acme" }, patch), competitors: [{ name: "Alpina", nit: "860025900" }] };
    values.newsGroups = { ...values.newsGroups, company: ["Alpina"] };
    const profile = buildProfile(values, patch, { id: "acme", now });
    expect(profile.newsGroups.sector.contextTerms).toBe("all");
    expect(profile.newsGroups.operations.contextTerms).toEqual([]);
    expect(profile.newsGroups.company.terms).toEqual(["Acme", "Alpina"]);
    expect(profile.competitors).toEqual([{ name: "Alpina", nit: "860025900" }]);
  });

  it("trims and drops repeated terms and fills the Colombian context words with the city", () => {
    const values = buildConfirmValues({ name: "Acme", city: "Pasto" }, {});
    values.regulationKeywords = [" agua ", "Agua", "residuos"];
    const profile = buildProfile(values, {}, { id: "a", now });
    expect(profile.regulationKeywords).toEqual(["agua", "residuos"]);
    expect(profile.colombiaContextWords).toContain("Pasto");
  });
});

describe("editing an existing company", () => {
  it("round-trips a profile through the confirm values without changing it", () => {
    const seed = profileToSeed(TEST_COMPANY);
    const patch = profileToPatch(TEST_COMPANY);
    const updated = updateProfile(TEST_COMPANY, buildConfirmValues(seed, patch), { patch, now });
    expect(updated).toMatchObject({
      id: TEST_COMPANY.id,
      name: TEST_COMPANY.name,
      nit: TEST_COMPANY.nit,
      activity: TEST_COMPANY.activity,
      competitors: TEST_COMPANY.competitors,
      goals: TEST_COMPANY.goals,
      thresholds: TEST_COMPANY.thresholds,
      createdAt: TEST_COMPANY.createdAt,
      regulationKeywords: TEST_COMPANY.regulationKeywords,
    });
    expect(updated.newsGroups.company.contextTerms).toEqual(TEST_COMPANY.newsGroups.company.contextTerms);
    expect(updated.newsGroups.sector).toEqual(TEST_COMPANY.newsGroups.sector);
    expect(updated.updatedAt).toBe(now.toISOString());
    expect(companyProfileSchema.safeParse(updated).success).toBe(true);
  });

  it("applies the edited values and drops a cleared NIT, keeping id, thresholds and creation date", () => {
    const values = { ...buildConfirmValues(profileToSeed(TEST_COMPANY), profileToPatch(TEST_COMPANY)), name: "Nuevo Nombre", nit: "", sector: "Metalmecánica" };
    const updated = updateProfile(TEST_COMPANY, values, { patch: profileToPatch(TEST_COMPANY), now });
    expect(updated).toMatchObject({ id: TEST_COMPANY.id, name: "Nuevo Nombre", sector: "Metalmecánica", createdAt: TEST_COMPANY.createdAt });
    expect(updated.nit).toBeUndefined();
    expect(updated.thresholds).toEqual(TEST_COMPANY.thresholds);
  });

  it("keeps what the profile has and the new answers add on top of it", () => {
    const patch = { ...profileToPatch(TEST_COMPANY), colombiaContextWords: ["Rionegro"], sector: "Metalmecánica" };
    const updated = updateProfile(TEST_COMPANY, buildConfirmValues(profileToSeed(TEST_COMPANY), patch), { patch, now });
    expect(updated.colombiaContextWords).toContain("Rionegro");
    expect(updated.colombiaContextWords).toContain("Colombia");
  });
});
