import type { Provenance } from "./provenance";

export interface CompanyFinancials {
  nit: string;
  name: string;
  city?: string;
  ciiu?: string;
  cutoffYear: number;
  revenue: number;
  netIncome: number;
  totalAssets?: number;
  /** For example "unit not declared by the source". */
  unitNote: string;
  provenance: Provenance;
}
