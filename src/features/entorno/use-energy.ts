"use client";

import { useQuery } from "@tanstack/react-query";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import type { Observation } from "@/core/domain/observation";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { createEnergyClientAdapter, type EnergyClientQuery } from "@/infrastructure/sources/xm/client-adapter";
import { getContainer } from "./container";
import { toSourceView } from "./source-view";
import type { ObservationsData } from "./use-world-bank";

/** Days of spot price the screens ask for: enough for the two 7-day windows plus a month of context. */
export const ENERGY_DAYS = 30;

let adapter: SourceAdapter<EnergyClientQuery, Observation[]> | undefined;

/** XM sends no CORS headers, so the browser reads our own `/api/energia` route instead. */
function energyAdapter() {
  adapter ??= createEnergyClientAdapter({ fetcher: createFetcher({ fetchImpl: (...args) => window.fetch(...args) }) });
  return adapter;
}

/** Daily mean national spot electricity price (XM), in COP/kWh. */
export function useEnergy() {
  const query = useQuery<ObservationsData & { off: boolean }>({
    queryKey: ["energy-spot", ENERGY_DAYS],
    retry: false,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const result = await energyAdapter().fetch({ days: ENERGY_DAYS }, { signal, now: getContainer().clock.now() });
      if (result.ok) return { observations: result.value.data, provenance: result.value.provenance, off: false };
      if (result.error.kind === "disabled") return { observations: [], off: true };
      if (result.error.kind === "empty") return { observations: [], off: false };
      throw new Error(result.error.message);
    },
  });
  return { query, view: toSourceView(query), data: query.data, observations: query.data?.observations ?? [] };
}
