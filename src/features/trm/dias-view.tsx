"use client";

import { ListOrderedIcon } from "lucide-react";
import { PageIntro } from "@/components/shell/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertas } from "@/features/avisos/use-alertas";
import { PeriodoSelect } from "./periodo";
import { TrmData } from "./trm-data";
import { TrmGrid } from "./trm-grid";

export function DiasView() {
  const { estaGuardado, alternar } = useAlertas();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro description="Cada día de la TRM con su variación frente al día anterior. Puede guardar un día como aviso para revisarlo después."
        actions={<PeriodoSelect />}
      />
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
    </div>
  );
}
