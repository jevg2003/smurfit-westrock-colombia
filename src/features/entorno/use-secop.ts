"use client";

import { useQuery } from "@tanstack/react-query";
import { COMPANY, COMPETITORS } from "@/content/config/empresa";
import type { PublicContract } from "@/core/domain/contract";
import type { Provenance } from "@/core/domain/provenance";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";

export interface SecopData {
  contracts: PublicContract[];
  /** Absent when the source answered with no contracts. */
  provenance?: Provenance;
}

const NITS = [COMPANY.nit, ...COMPETITORS.map((competitor) => competitor.nit)];

/** SECOP II contracts of the company and its competitors, read from the browser. */
export function useSecop() {
  const query = useQuery<SecopData>({
    queryKey: ["secop", NITS],
    retry: false,
    staleTime: 15 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { secop, clock } = getContainer();
      const result = await secop.fetch({ nits: NITS }, { signal, now: clock.now() });
      if (result.ok) return { contracts: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { contracts: [] };
      throw new Error(result.error.message);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
