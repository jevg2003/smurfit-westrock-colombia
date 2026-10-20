"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrm } from "./api";
import type { PuntoTrm, TrmRegistro } from "./types";

export const UMBRAL_ATIPICO_PCT = 1;

function procesar(registros: TrmRegistro[]): PuntoTrm[] {
  const ascendente = [...registros].sort((a, b) => a.vigenciadesde.localeCompare(b.vigenciadesde));

  return ascendente.map((registro, indice) => {
    const valor = Number(registro.valor);
    const anterior = indice > 0 ? Number(ascendente[indice - 1].valor) : null;
    const variacionPct = anterior ? ((valor - anterior) / anterior) * 100 : null;

    return {
      fecha: registro.vigenciadesde,
      valor,
      variacionPct,
      atipico: variacionPct !== null && Math.abs(variacionPct) >= UMBRAL_ATIPICO_PCT,
    };
  });
}

export function useTrm(dias: number) {
  return useQuery({
    queryKey: ["trm", dias],
    queryFn: () => fetchTrm(dias),
    select: procesar,
    staleTime: 60 * 60 * 1000,
  });
}
