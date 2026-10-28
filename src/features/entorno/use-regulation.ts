"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { RegulationEntry, RegulationItem } from "@/core/domain/regulation";
import { loadCuratedNorms } from "@/infrastructure/sources/curated/norms";
import type { RegulationBlock } from "@/infrastructure/sources/regulation/client-adapter";
import { useCompany } from "@/stores/companies.store";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import { regulationQueryTerms } from "./regulation-terms";
import { SourceFailure } from "./source-failure";

export interface RegulationData {
  minambiente: RegulationBlock;
  presidencia: RegulationBlock;
  /** True when both sources are switched off by the server flags. */
  off: boolean;
}

const OFF_BLOCK: RegulationBlock = { status: "disabled", items: [] };

/** The hand-picked norms (always available: they ship with the app). */
export function useCuratedNorms(): RegulationEntry[] {
  return useMemo(() => loadCuratedNorms(), []);
}

/** The terms that make a Minambiente post or a decree relevant for the signal rule: the ones of the company profile. */
export function useRegulationTerms() {
  const { regulationKeywords, regulationExcludeKeywords } = useCompany();
  return useMemo(() => ({ include: regulationKeywords, exclude: regulationExcludeKeywords }), [regulationKeywords, regulationExcludeKeywords]);
}

/** Minambiente posts and Presidencia decrees, read from our own `/api/regulacion` route. */
export function useRegulation() {
  const company = useCompany();
  const query = useQuery<RegulationData>({
    queryKey: ["regulation", company.id, company.updatedAt],
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { regulation, clock } = getContainer();
      const result = await regulation.fetch({ terms: regulationQueryTerms(company) }, { signal, now: clock.now() });
      if (result.ok) return { ...result.value.data, off: false };
      if (result.error.kind === "disabled") return { minambiente: OFF_BLOCK, presidencia: OFF_BLOCK, off: true };
      throw new SourceFailure(result.error);
    },
  });
  const items = useMemo<RegulationItem[]>(
    () => [...(query.data?.minambiente.items ?? []), ...(query.data?.presidencia.items ?? [])],
    [query.data],
  );
  return { query, view: toSourceView(query), data: query.data, items, fetchedAt: query.dataUpdatedAt };
}
