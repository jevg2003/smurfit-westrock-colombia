"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { watchedNits } from "@/core/company/profile";
import type { PublicContract } from "@/core/domain/contract";
import type { Provenance } from "@/core/domain/provenance";
import { useCompany } from "@/stores/companies.store";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import { SourceFailure } from "./source-failure";

export interface SecopData {
  contracts: PublicContract[];
  /** Absent when the source answered with no contracts. */
  provenance?: Provenance;
}

/** SECOP II contracts of the company and its competitors, read from the browser. */
export function useSecop() {
  const company = useCompany();
  const nits = useMemo(() => watchedNits(company), [company]);
  const query = useQuery<SecopData>({
    queryKey: ["secop", nits],
    retry: false,
    staleTime: 15 * 60 * 1000,
    queryFn: async ({ signal }) => {
      // A company without NIT has nothing to look up: no request is made.
      if (nits.length === 0) return { contracts: [] };
      const { secop, clock } = getContainer();
      const result = await secop.fetch({ nits }, { signal, now: clock.now() });
      if (result.ok) return { contracts: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { contracts: [] };
      throw new SourceFailure(result.error);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
