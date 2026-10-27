"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { watchedNits } from "@/core/company/profile";
import type { CompanyFinancials } from "@/core/domain/company";
import type { Provenance } from "@/core/domain/provenance";
import { useCompany } from "@/stores/companies.store";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import { SourceFailure } from "./source-failure";

export interface FinancialsData {
  /** One row per company and cutoff year. */
  financials: CompanyFinancials[];
  /** Absent when the source answered with no data. */
  provenance?: Provenance;
}

/** Annual financial figures of the company and its competitors (Supersociedades). */
export function useSupersociedades() {
  const company = useCompany();
  const nits = useMemo(() => watchedNits(company), [company]);
  const query = useQuery<FinancialsData>({
    queryKey: ["supersociedades", nits],
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      // A company without NIT has nothing to look up: no request is made.
      if (nits.length === 0) return { financials: [] };
      const { supersociedades, clock } = getContainer();
      const result = await supersociedades.fetch({ nits }, { signal, now: clock.now() });
      if (result.ok) return { financials: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { financials: [] };
      throw new SourceFailure(result.error);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
