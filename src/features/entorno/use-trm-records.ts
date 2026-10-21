"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrm } from "@/features/trm/api";
import { toSourceView } from "./source-view";

/** One year of TRM, the history the signal rules read. */
export const TRM_HISTORY_DAYS = 365;

export function useTrmRecords() {
  const query = useQuery({
    queryKey: ["trm", "raw", TRM_HISTORY_DAYS],
    retry: false,
    staleTime: 60 * 60 * 1000,
    queryFn: () => fetchTrm(TRM_HISTORY_DAYS),
  });
  return { query, view: toSourceView(query), data: query.data };
}
