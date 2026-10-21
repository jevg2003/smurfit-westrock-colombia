"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { REGULATION_EXCLUDE_KEYWORDS, REGULATION_KEYWORDS } from "@/content/config/empresa";
import type { RegulationEntry, RegulationItem } from "@/core/domain/regulation";
import { loadCuratedNorms } from "@/infrastructure/sources/curated/norms";
import type { RegulationBlock } from "@/infrastructure/sources/regulation/client-adapter";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";

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

/** The terms that make a Minambiente post or a decree relevant for the signal rule. */
export const REGULATION_TERMS = { include: REGULATION_KEYWORDS, exclude: REGULATION_EXCLUDE_KEYWORDS } as const;

/** Minambiente posts and Presidencia decrees, read from our own `/api/regulacion` route. */
export function useRegulation() {
  const query = useQuery<RegulationData>({
    queryKey: ["regulation"],
    retry: false,
    staleTime: 30 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { regulation, clock } = getContainer();
      const result = await regulation.fetch({}, { signal, now: clock.now() });
      if (result.ok) return { ...result.value.data, off: false };
      if (result.error.kind === "disabled") return { minambiente: OFF_BLOCK, presidencia: OFF_BLOCK, off: true };
      throw new Error(result.error.message);
    },
  });
  const items = useMemo<RegulationItem[]>(
    () => [...(query.data?.minambiente.items ?? []), ...(query.data?.presidencia.items ?? [])],
    [query.data],
  );
  return { query, view: toSourceView(query), data: query.data, items, fetchedAt: query.dataUpdatedAt };
}
