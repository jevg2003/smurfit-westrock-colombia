"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlertas } from "@/features/alertas/use-alertas";
import { exportarCsv } from "@/lib/csv";
import { TrmData } from "./trm-data";
import { TrmTable } from "./trm-table";

export function DiasView() {
  const { estaGuardado, alternar } = useAlertas();

  return (
    <TrmData>
      {(datos) => (
        <>
          <div className="flex shrink-0 justify-end">
            <Button variant="outline" size="sm" onClick={() => exportarCsv(datos, "trm-smurfit-westrock.csv")}>
              <DownloadIcon aria-hidden="true" />
              Exportar CSV
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <TrmTable datos={datos} estaGuardado={estaGuardado} onAlternarAlerta={alternar} />
          </div>
        </>
      )}
    </TrmData>
  );
}
