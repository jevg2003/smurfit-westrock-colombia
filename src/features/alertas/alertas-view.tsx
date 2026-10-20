"use client";

import { EmptyState } from "@/components/states/empty-state";
import { TrmData } from "@/features/trm/trm-data";
import { TrmTable } from "@/features/trm/trm-table";
import { useAlertas } from "./use-alertas";

export function AlertasView() {
  const { ids, estaGuardado, alternar } = useAlertas();

  return (
    <TrmData>
      {(datos) => {
        const guardados = datos.filter((punto) => ids.includes(punto.fecha));

        return guardados.length === 0 ? (
          <EmptyState message="Todavía no guardaste alertas en este período. Marcá un día desde “Días y variaciones”." />
        ) : (
          <TrmTable datos={guardados} estaGuardado={estaGuardado} onAlternarAlerta={alternar} ocultarFiltro />
        );
      }}
    </TrmData>
  );
}
