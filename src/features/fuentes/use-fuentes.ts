"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toSourceView } from "@/features/entorno/source-view";
import { useExports } from "@/features/entorno/use-exports";
import { useNews } from "@/features/entorno/use-news";
import { useCuratedNorms, useRegulation } from "@/features/entorno/use-regulation";
import { useSecop } from "@/features/entorno/use-secop";
import { useSupersociedades } from "@/features/entorno/use-supersociedades";
import { useWorldBank } from "@/features/entorno/use-world-bank";
import { usePeriodo } from "@/features/trm/periodo";
import { useTrm } from "@/features/trm/use-trm";
import { buildGroups, type FuenteGroup, type StatusInput } from "./build-rows";
import { fromView } from "./snapshots";
import { fuentesStatusSchema, type FuentesStatus } from "./status-schema";

/** Server flags and AI configuration. Read-only booleans: the route never returns secrets. */
function useFuentesStatus() {
  return useQuery<FuentesStatus>({
    queryKey: ["fuentes-status"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/fuentes", { signal });
      if (!response.ok) throw new Error(`El servidor respondió con el estado ${response.status}.`);
      return fuentesStatusSchema.parse(await response.json());
    },
  });
}

/**
 * Health of every source, read from the same TanStack Query hooks (and cache) the screens use.
 * Each hook only fetches when its data is missing or older than its own `staleTime`, and each
 * source is retried on its own with the `refetch` of its query.
 */
export function useFuentes(): { groups: FuenteGroup[]; total: number } {
  const { dias } = usePeriodo();
  const trm = useTrm(dias);
  const secop = useSecop();
  const pib = useWorldBank("pib");
  const ipc = useWorldBank("ipc_anual");
  const exportsHook = useExports();
  const supersociedades = useSupersociedades();
  const news = useNews();
  const regulation = useRegulation();
  const norms = useCuratedNorms();
  const statusQuery = useFuentesStatus();

  const groups = useMemo(() => {
    const status: StatusInput = statusQuery.data ? { state: "ok", data: statusQuery.data } : { state: statusQuery.isError ? "error" : "pending" };
    return buildGroups({
      trm: fromView(toSourceView(trm), { empty: trm.data?.length === 0 }),
      secop: fromView(secop.view, { empty: secop.data?.contracts.length === 0 }),
      pib: fromView(pib.view, { empty: pib.data?.observations.length === 0 }),
      ipc: fromView(ipc.view, { empty: ipc.data?.observations.length === 0 }),
      exports: fromView(exportsHook.view, { empty: exportsHook.data?.observations.length === 0 }),
      supersociedades: fromView(supersociedades.view, { empty: supersociedades.data?.financials.length === 0 }),
      news: {
        snapshot: fromView(news.view, { off: news.data?.off }),
        feeds: news.data?.feeds ?? [],
        off: news.data?.off ?? false,
        ...(news.view.updatedAt !== undefined ? { fetchedAt: news.view.updatedAt } : {}),
      },
      regulation: {
        snapshot: fromView(regulation.view, { off: regulation.data?.off }),
        ...(regulation.data && !regulation.data.off ? { data: regulation.data } : {}),
        ...(regulation.view.updatedAt !== undefined ? { fetchedAt: regulation.view.updatedAt } : {}),
      },
      curatedCount: norms.length,
      status,
      retryStatus: () => void statusQuery.refetch(),
    });
  }, [trm, secop.view, secop.data, pib.view, pib.data, ipc.view, ipc.data, exportsHook.view, exportsHook.data, supersociedades.view, supersociedades.data, news.view, news.data, regulation.view, regulation.data, norms, statusQuery]);

  return { groups, total: groups.reduce((sum, group) => sum + group.rows.length, 0) };
}
