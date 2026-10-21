import { describe, expect, it } from "vitest";
import type { CompanyFinancials } from "../domain/company";
import { latestFinancialsByNit, netMarginPct } from "./financials";

const provenance = {
  sourceId: "supersociedades",
  url: "https://example.test",
  fetchedAt: "2026-10-20T15:00:00.000Z",
  license: "CC BY-SA 4.0",
  attribution: "Superintendencia de Sociedades vía datos.gov.co",
} as const;

const row = (nit: string, cutoffYear: number, revenue: number, netIncome: number): CompanyFinancials => ({
  nit,
  name: `Empresa ${nit}`,
  cutoffYear,
  revenue,
  netIncome,
  unitNote: "unidad no declarada por la fuente",
  provenance,
});

describe("latestFinancialsByNit", () => {
  it("keeps the most recent cutoff year of each NIT", () => {
    const latest = latestFinancialsByNit([row("1", 2023, 1, 0), row("1", 2025, 3, 0), row("2", 2024, 5, 0), row("1", 2024, 2, 0)]);
    expect(latest.get("1")?.cutoffYear).toBe(2025);
    expect(latest.get("2")?.cutoffYear).toBe(2024);
    expect(latest.size).toBe(2);
  });

  it("returns an empty map for no rows", () => {
    expect(latestFinancialsByNit([]).size).toBe(0);
  });
});

describe("netMarginPct", () => {
  it("is net income over revenue in percent", () => {
    expect(netMarginPct(row("1", 2025, 1.91, 0.18))).toBeCloseTo(9.42, 2);
    expect(netMarginPct(row("1", 2025, 0.5, -0.05))).toBeCloseTo(-10, 6);
  });

  it("is null when revenue is zero or negative, so no margin is made up", () => {
    expect(netMarginPct(row("1", 2025, 0, 0.1))).toBeNull();
    expect(netMarginPct(row("1", 2025, -1, 0.1))).toBeNull();
  });
});
