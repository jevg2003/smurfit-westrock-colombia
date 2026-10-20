"use client";

import { ListOrderedIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertas } from "@/features/alertas/use-alertas";
import { TrmData } from "./trm-data";
import { TrmGrid } from "./trm-grid";

export function DiasView() {
  const { estaGuardado, alternar } = useAlertas();

  return (
    <TrmData
      loading={<Skeleton role="status" aria-label="Consultando la TRM en datos.gov.co" className="h-120 rounded-xl" />}
    >
      {(datos) => (
        <TrmGrid
          title="Días y variaciones"
          icon={<ListOrderedIcon aria-hidden="true" />}
          datos={datos}
          estaGuardado={estaGuardado}
          onAlternarAlerta={alternar}
        />
      )}
    </TrmData>
  );
}
