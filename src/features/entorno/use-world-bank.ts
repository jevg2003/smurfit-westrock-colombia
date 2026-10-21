"use client";

import { useQuery } from "@tanstack/react-query";
import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { WorldBankIndicator } from "@/infrastructure/sources/world-bank/adapter";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import { SourceFailure } from "./source-failure";

export interface ObservationsData {
  observations: Observation[];
  /** Absent when the source answered with no data. */
  provenance?: Provenance;
}

/** Annual GDP growth or CPI inflation of Colombia (World Bank), read from the browser. */
export function useWorldBank(indicator: WorldBankIndicator) {
  const query = useQuery<ObservationsData>({
    queryKey: ["world-bank", indicator],
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { worldBank, clock } = getContainer();
      const result = await worldBank.fetch({ indicator }, { signal, now: clock.now() });
      if (result.ok) return { observations: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { observations: [] };
      throw new SourceFailure(result.error);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
