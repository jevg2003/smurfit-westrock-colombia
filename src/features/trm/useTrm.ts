import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchTrm } from "../../api/trm";
import type { PuntoTrm } from "../../api/types";

export const UMBRAL_ATIPICO_PCT = 1;

function procesar(registros: Awaited<ReturnType<typeof fetchTrm>>): PuntoTrm[] {
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

export function useTrm(dias = 365) {
  const consulta = useQuery({
    queryKey: ["trm", dias],
    queryFn: () => fetchTrm(dias),
    staleTime: 60 * 60 * 1000,
  });

  const procesado = useMemo(
    () => (consulta.data ? procesar(consulta.data) : undefined),
    [consulta.data],
  );

  return { ...consulta, data: procesado };
}
