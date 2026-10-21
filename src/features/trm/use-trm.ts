"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { computeTrmDailyMoves } from "@/core/rules/trm-daily-move";
import { usePreferencesStore } from "@/stores/preferences.store";
import { fetchTrm } from "./api";
import type { PuntoTrm, TrmRegistro } from "./types";

/** Default threshold, from the company config. The active value comes from preferences. */
export const UMBRAL_ATIPICO_PCT = DEFAULT_THRESHOLDS.trmDailyMovePct;

export function procesar(registros: TrmRegistro[], umbralPct: number = UMBRAL_ATIPICO_PCT): PuntoTrm[] {
  return computeTrmDailyMoves(
    registros.map((registro) => ({ validFrom: registro.vigenciadesde, value: registro.valor })),
    umbralPct,
  ).map((move) => ({
    fecha: move.date,
    valor: move.value,
    variacionPct: move.changePct,
    atipico: move.isAtypical,
  }));
}

/** Active daily-move threshold (percent), from preferences. */
export function useTrmThreshold(): number {
  return usePreferencesStore((state) => state.thresholds.trmDailyMovePct);
}

export function useTrm(dias: number) {
  const umbralPct = usePreferencesStore((state) => state.thresholds.trmDailyMovePct);
  return useQuery({
    queryKey: ["trm", dias],
    queryFn: () => fetchTrm(dias),
    select: (registros) => procesar(registros, umbralPct),
    staleTime: 60 * 60 * 1000,
  });
}
