"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_TRM_DAILY_MOVE_PCT, computeTrmDailyMoves } from "@/core/rules/trm-daily-move";
import { fetchTrm } from "./api";
import type { PuntoTrm, TrmRegistro } from "./types";

export const UMBRAL_ATIPICO_PCT = DEFAULT_TRM_DAILY_MOVE_PCT;

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

export function useTrm(dias: number) {
  return useQuery({
    queryKey: ["trm", dias],
    queryFn: () => fetchTrm(dias),
    select: (registros) => procesar(registros),
    staleTime: 60 * 60 * 1000,
  });
}
