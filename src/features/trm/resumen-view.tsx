"use client";

import { KpiCard } from "@/components/shell/kpi-card";
import { useAlertas } from "@/features/alertas/use-alertas";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { TrmChart } from "./trm-chart";
import { TrmData } from "./trm-data";
import type { PuntoTrm } from "./types";

function Kpis({ datos }: { datos: PuntoTrm[] }) {
  const { ids } = useAlertas();
  const ultimo = datos[datos.length - 1];
  if (!ultimo) return null;

  const maximo = Math.max(...datos.map((punto) => punto.valor));
  const atipicos = datos.filter((punto) => punto.atipico).length;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-5">
      <KpiCard label="TRM hoy" value={formatCop(ultimo.valor)} note={formatFecha(ultimo.fecha)} />
      <KpiCard
        label="Variación vs. día anterior"
        value={ultimo.variacionPct !== null ? `${ultimo.variacionPct.toFixed(2)}%` : "—"}
      />
      <KpiCard label="Máximo del período" value={formatCop(maximo)} />
      <KpiCard label="Días con variación atípica" value={String(atipicos)} />
      <KpiCard label="Alertas guardadas" value={String(ids.length)} />
    </div>
  );
}

export function ResumenView() {
  return (
    <TrmData>
      {(datos) => (
        <>
          <Kpis datos={datos} />
          <div className="min-h-0 flex-1">
            <TrmChart datos={datos} />
          </div>
        </>
      )}
    </TrmData>
  );
}
