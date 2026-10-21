import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { parseTerms, validateThresholds, type ThresholdFields } from "./validate";

const fields = (overrides: Partial<ThresholdFields> = {}): ThresholdFields => ({
  trmDailyMovePct: "1",
  trmDailyAlertPct: "2",
  contractExpiryWatchDays: "90",
  contractExpiryAlertDays: "30",
  competitorContractWindowDays: "30",
  ...overrides,
});

describe("validateThresholds", () => {
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
