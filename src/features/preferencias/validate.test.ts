import { describe, expect, it } from "vitest";
import { TERMS_PER_GROUP_MAX, TERM_MAX } from "@/core/company/fields";
import { fieldMeta } from "@/lib/schema-meta";
import { termsSchema, thresholdsSchema, wordsSchema, type ThresholdValues } from "./validate";

const values = (overrides: Partial<ThresholdValues> = {}): ThresholdValues => ({
  trmDailyMovePct: 1,
  trmDailyAlertPct: 2,
  contractExpiryWatchDays: 90,
  contractExpiryAlertDays: 30,
  competitorContractWindowDays: 30,
  energySpotWeeklyMovePct: 15,
  energySpotWeeklyAlertPct: 30,
  ...overrides,
});

const issueMap = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));

describe("thresholdsSchema (the schema the form validates with)", () => {
  it("accepts valid numbers", () => {
    expect(thresholdsSchema.safeParse(values()).success).toBe(true);
  });

  it("gives one neutral Spanish message per field, all at once", () => {
    const result = thresholdsSchema.safeParse(
      values({ trmDailyMovePct: undefined, trmDailyAlertPct: -1, contractExpiryWatchDays: 0, contractExpiryAlertDays: 1.5, competitorContractWindowDays: 400 }),
    );
    expect(issueMap(result)).toEqual({
      trmDailyMovePct: "Escriba un número.",
      trmDailyAlertPct: "El valor debe ser mayor que cero.",
      contractExpiryWatchDays: "El valor debe ser mayor que cero.",
      contractExpiryAlertDays: "Use un número entero de días.",
      competitorContractWindowDays: "El valor no puede pasar de 365.",
    });
  });

  it("keeps the order rules between watch and alert", () => {
    expect(issueMap(thresholdsSchema.safeParse(values({ trmDailyMovePct: 3, trmDailyAlertPct: 2 })))).toEqual({
      trmDailyAlertPct: "El umbral de alerta debe ser igual o mayor que el de vigilar.",
    });
    expect(issueMap(thresholdsSchema.safeParse(values({ energySpotWeeklyMovePct: 20, energySpotWeeklyAlertPct: 10 })))).toEqual({
      energySpotWeeklyAlertPct: "El umbral de alerta debe ser igual o mayor que el de vigilar.",
    });
    expect(issueMap(thresholdsSchema.safeParse(values({ contractExpiryWatchDays: 20, contractExpiryAlertDays: 30 })))).toEqual({
      contractExpiryAlertDays: "Los días de alerta deben ser igual o menores que los de vigilar.",
    });
  });

  it("exposes the range of each threshold to its field", () => {
    expect(fieldMeta(thresholdsSchema, "trmDailyMovePct")).toMatchObject({ required: true, min: 0, max: 50 });
    expect(fieldMeta(thresholdsSchema, "energySpotWeeklyAlertPct")).toMatchObject({ max: 200 });
    expect(fieldMeta(thresholdsSchema, "contractExpiryWatchDays")).toMatchObject({ max: 730, integer: true });
    expect(fieldMeta(thresholdsSchema, "trmDailyMovePct").integer).toBeUndefined();
  });
});

describe("termsSchema and wordsSchema", () => {
  const schema = termsSchema(["company", "sector"]);

  it("accepts lists of terms", () => {
    expect(schema.safeParse({ company: ["a", "b"], sector: [] }).success).toBe(true);
  });

  it("names the group whose term is too long, with the company limit", () => {
    expect(issueMap(schema.safeParse({ company: ["ok"], sector: ["a".repeat(TERM_MAX + 1)] }))).toEqual({ sector: "Use 120 caracteres como máximo." });
  });

  it("limits the number of terms per group", () => {
    const many = Array.from({ length: TERMS_PER_GROUP_MAX + 1 }, (_, i) => `p${i}`);
    expect(issueMap(schema.safeParse({ company: many, sector: [] }))).toEqual({ company: "Use 40 términos como máximo." });
  });

  it("shares the limits with the company profile and the fields", () => {
    expect(fieldMeta(schema, "sector")).toMatchObject({ maxItems: TERMS_PER_GROUP_MAX, itemMaxLength: TERM_MAX, required: false });
    expect(fieldMeta(wordsSchema(["companyContext"]), "companyContext")).toMatchObject({ maxItems: TERMS_PER_GROUP_MAX, itemMaxLength: TERM_MAX });
  });
});
