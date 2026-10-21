import type { CompanyFinancials } from "../domain/company";

/** The most recent cutoff year of each NIT. */
export function latestFinancialsByNit(rows: readonly CompanyFinancials[]): Map<string, CompanyFinancials> {
  const latest = new Map<string, CompanyFinancials>();
  for (const row of rows) {
    const current = latest.get(row.nit);
    if (!current || row.cutoffYear > current.cutoffYear) latest.set(row.nit, row);
  }
  return latest;
}

/**
 * Net income over revenue, in percent. The unit cancels out, so it holds even though the source
 * does not declare one. Null when revenue is not positive.
 */
export function netMarginPct(financials: Pick<CompanyFinancials, "revenue" | "netIncome">): number | null {
  return financials.revenue > 0 ? (financials.netIncome / financials.revenue) * 100 : null;
}
