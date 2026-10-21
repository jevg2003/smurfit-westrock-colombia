import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { parseTerms, termsSchema, thresholdsSchema, validateThresholds, type ThresholdFields } from "./validate";

const fields = (overrides: Partial<ThresholdFields> = {}): ThresholdFields => ({
  trmDailyMovePct: "1",
  trmDailyAlertPct: "2",
  contractExpiryWatchDays: "90",
  contractExpiryAlertDays: "30",
  competitorContractWindowDays: "30",
  energySpotWeeklyMovePct: "15",
  energySpotWeeklyAlertPct: "30",
  ...overrides,
});

describe("validateThresholds", () => {
  it("requires the energy alert level to be at least the watch level", () => {
    const inverted = validateThresholds(fields({ energySpotWeeklyMovePct: "20", energySpotWeeklyAlertPct: "10" }));
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.errors.energySpotWeeklyAlertPct).toMatch(/igual o mayor/);
    expect(validateThresholds(fields({ energySpotWeeklyMovePct: "12,5" })).ok).toBe(true);
  });

  it("accepts the defaults, with a decimal comma", () => {
    const result = validateThresholds(fields({ trmDailyMovePct: "1,5", trmDailyAlertPct: "3" }));
    expect(result).toEqual({ ok: true, value: { ...DEFAULT_THRESHOLDS, trmDailyMovePct: 1.5, trmDailyAlertPct: 3 } });
  });

  it("rejects empty, non numeric, zero and negative values with a message per field", () => {
    const result = validateThresholds(
      fields({ trmDailyMovePct: "", trmDailyAlertPct: "abc", contractExpiryWatchDays: "0", contractExpiryAlertDays: "-3" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["contractExpiryAlertDays", "contractExpiryWatchDays", "trmDailyAlertPct", "trmDailyMovePct"].sort(),
      );
      expect(result.errors.trmDailyMovePct).toBe("Escribe un número.");
    }
  });

  it("requires whole days and sensible order between watch and alert", () => {
    const decimalDays = validateThresholds(fields({ contractExpiryWatchDays: "45.5" }));
    expect(decimalDays.ok).toBe(false);

    const inverted = validateThresholds(fields({ trmDailyMovePct: "3", trmDailyAlertPct: "2" }));
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) expect(inverted.errors.trmDailyAlertPct).toMatch(/igual o mayor/);

    const days = validateThresholds(fields({ contractExpiryWatchDays: "20", contractExpiryAlertDays: "30" }));
    expect(days.ok).toBe(false);
    if (!days.ok) expect(days.errors.contractExpiryAlertDays).toMatch(/igual o menor/);
  });
});

describe("parseTerms", () => {
  it("splits lines, trims and removes duplicates", () => {
    expect(parseTerms(" gas natural \n\nYumbo\ngas natural")).toEqual({ ok: true, value: ["gas natural", "Yumbo"] });
  });

  it("rejects terms that are too long", () => {
    const result = parseTerms("a".repeat(81));
    expect(result.ok).toBe(false);
  });
});

const issueMap = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));

describe("thresholdsSchema (the schema the form validates with)", () => {
  it("accepts valid text fields", () => {
    expect(thresholdsSchema.safeParse(fields()).success).toBe(true);
  });

  it("gives one neutral Spanish message per field, all at once", () => {
    const result = thresholdsSchema.safeParse(
      fields({ trmDailyMovePct: "", trmDailyAlertPct: "abc", contractExpiryWatchDays: "0", contractExpiryAlertDays: "1.5", competitorContractWindowDays: "400" }),
    );
    expect(issueMap(result)).toEqual({
      trmDailyMovePct: "Escribe un número.",
      trmDailyAlertPct: "Escribe un número.",
      contractExpiryWatchDays: "El valor debe ser mayor que cero.",
      contractExpiryAlertDays: "Usa un número entero de días.",
      competitorContractWindowDays: "El valor no puede pasar de 365.",
    });
  });

  it("keeps the order rules between watch and alert", () => {
    expect(issueMap(thresholdsSchema.safeParse(fields({ trmDailyMovePct: "3", trmDailyAlertPct: "2" })))).toEqual({
      trmDailyAlertPct: "El umbral de alerta debe ser igual o mayor que el de vigilar.",
    });
  });
});

describe("termsSchema", () => {
  const schema = termsSchema(["company", "sector"]);

  it("accepts one term per line", () => {
    expect(schema.safeParse({ company: "a\nb", sector: "" }).success).toBe(true);
  });

  it("names the group whose terms are too long", () => {
    const result = schema.safeParse({ company: "ok", sector: "a".repeat(81) });
    expect(issueMap(result)).toEqual({ sector: "Cada término puede tener hasta 80 caracteres." });
  });
});
