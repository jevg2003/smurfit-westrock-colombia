"use client";

import { useQuery } from "@tanstack/react-query";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import { SourceFailure } from "./source-failure";
import type { ObservationsData } from "./use-world-bank";

/** Quarterly national non-mining-energy exports (MinCIT via datos.gov.co). */
export function useExports() {
  const query = useQuery<ObservationsData>({
    queryKey: ["exports"],
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { exports, clock } = getContainer();
      const result = await exports.fetch({}, { signal, now: clock.now() });
      if (result.ok) return { observations: result.value.data, provenance: result.value.provenance };
      if (result.error.kind === "empty") return { observations: [] };
      throw new SourceFailure(result.error);
    },
  });
  return { query, view: toSourceView(query), data: query.data };
}
