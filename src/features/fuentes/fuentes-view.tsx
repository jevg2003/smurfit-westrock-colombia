"use client";

import { Badge } from "@/components/reui/badge";
import { PageIntro } from "@/components/shell/page-intro";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FuenteCard } from "./fuente-card";
import { useFuentes } from "./use-fuentes";

/** Health of every data source: last success, last error, license and a per-source retry. */
export function FuentesView() {
  const { groups, total } = useFuentes();
  const rows = groups.flatMap((group) => group.rows);
  const count = (state: string) => rows.filter((row) => row.snapshot.state === state).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Fuentes"
        description="Estado de cada fuente de datos: de dónde viene, con qué licencia, cuándo funcionó por última vez y qué falló. Cada fuente se puede reintentar por separado."
      />

      {total === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay fuentes configuradas</EmptyTitle>
            <EmptyDescription>Cuando se agreguen fuentes aparecerán aquí con su estado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="success-light">{count("ok")} funcionando</Badge>
            <Badge variant="destructive-light">{count("error")} con error</Badge>
            <Badge variant="warning-light">{count("stale")} desactualizadas</Badge>
            <Badge variant="invert-light">{count("disabled")} desactivadas</Badge>
            {count("pending") > 0 && <Badge variant="primary-light">{count("pending")} consultando</Badge>}
          </p>

          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`grupo-${group.id}`} className="flex flex-col gap-2">
              <h2 id={`grupo-${group.id}`} className="text-sm font-medium">
                {group.title}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.rows.map((row) => (
                  <FuenteCard key={row.entry.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
