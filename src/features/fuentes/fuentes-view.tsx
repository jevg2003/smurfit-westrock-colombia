"use client";

import { Badge } from "@/components/reui/badge";
import { RegionEmpty } from "@/components/states/region-empty";
import { summarizeHealth } from "./health-summary";
import { FuenteEvent } from "./fuente-event";
import { useFuentes } from "./use-fuentes";

/** Health of every data source: last success, last error, license and a per-source retry. */
export function FuentesView() {
  const { groups, total } = useFuentes();
  const rows = groups.flatMap((group) => group.rows);
  const health = summarizeHealth(rows);
  const count = (state: string) => rows.filter((row) => row.snapshot.state === state).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">De dónde viene cada dato, con qué licencia y cuándo se leyó por última vez. Cada fuente se reintenta por separado.</p>

      {total === 0 ? (
        <RegionEmpty title="No hay fuentes configuradas" description="Cuando se agreguen fuentes aparecerán aquí con su estado." />
      ) : (
        <>
          <p aria-live="polite" className="flex items-center gap-2 text-sm font-medium" data-testid="health-summary">
            <Badge variant={health.tone} size="lg">
              {health.working} de {health.enabled} fuentes funcionando
            </Badge>
          </p>
          <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="success-light">{count("ok")} funcionando</Badge>
            <Badge variant="destructive-light">{count("error")} con error</Badge>
            <Badge variant="warning-light">{count("stale")} desactualizadas</Badge>
            <Badge variant="invert-light">{count("disabled")} desactivadas</Badge>
            {count("pending") > 0 && <Badge variant="primary-light">{count("pending")} consultando</Badge>}
          </p>

          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`grupo-${group.id}`} className="flex flex-col gap-2">
              <h2 id={`grupo-${group.id}`} className="text-sm font-semibold">
                {group.title}
              </h2>
              <ul aria-labelledby={`grupo-${group.id}`} className="flex flex-col divide-y">
                {group.rows.map((row) => (
                  <FuenteEvent key={row.entry.id} row={row} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
