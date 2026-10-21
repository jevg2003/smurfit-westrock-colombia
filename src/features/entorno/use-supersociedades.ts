"use client";

import { useQuery } from "@tanstack/react-query";
import { COMPANY, COMPETITORS } from "@/content/config/empresa";
import type { CompanyFinancials } from "@/core/domain/company";
import type { Provenance } from "@/core/domain/provenance";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";

export interface FinancialsData {
  /** One row per company and cutoff year. */
  financials: CompanyFinancials[];
  /** Absent when the source answered with no data. */
  provenance?: Provenance;
}

const NITS = [COMPANY.nit, ...COMPETITORS.map((competitor) => competitor.nit)];

/** Annual financial figures of the company and its competitors (Supersociedades). */
export function useSupersociedades() {
  const query = useQuery<FinancialsData>({
    queryKey: ["supersociedades", NITS],
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { supersociedades, clock } = getContainer();
      const result = await supersociedades.fetch({ nits: NITS }, { signal, now: clock.now() });
      if (result.ok) return { financials: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { financials: [] };
      throw new Error(result.error.message);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
