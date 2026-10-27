import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EventItem, type EventTone } from "@/components/events/event-item";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { formatHoraBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";
import type { FuenteRow } from "./build-rows";
import { ACCESS_LABELS } from "./catalog";
import type { RowState } from "./snapshots";
import { ERROR_KIND_LABELS } from "./source-state";

const STATE_VIEW: Record<RowState, { label: string; tone: EventTone }> = {
  ok: { label: "Funcionando", tone: "positive" },
  stale: { label: "Dato desactualizado", tone: "medium" },
  error: { label: "Con error", tone: "high" },
  empty: { label: "Sin datos", tone: "low" },
  disabled: { label: "Desactivada", tone: "neutral" },
  pending: { label: "Consultando", tone: "low" },
  unchecked: { label: "Sin consultar", tone: "neutral" },
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** One data source as a synchronization event: its state first, the facts one click away, retry on its own. */
export function FuenteEvent({ row }: { row: FuenteRow }) {
  const { entry, snapshot, flag } = row;
  const view = STATE_VIEW[snapshot.state];
  const internal = entry.url.startsWith("/");
  const href = internal ? entry.url : safeHttpUrl(entry.url);
  const lastSuccessAt = snapshot.lastSuccess === undefined ? undefined : new Date(snapshot.lastSuccess).toISOString();

  return (
    <EventItem
      title={entry.name}
      at={lastSuccessAt}
      source={entry.organization}
      badge={view}
      detail={snapshot.error ? `${ERROR_KIND_LABELS[snapshot.error.kind]}: ${snapshot.error.message}` : lastSuccessAt ? undefined : "Aún sin lectura correcta"}
      actions={
        snapshot.retry ? (
          <Button type="button" variant="outline" size="sm" onClick={snapshot.retry} aria-label={`Reintentar ${entry.name}`}>
            Reintentar
          </Button>
        ) : undefined
      }
    >
      <details className="group/facts text-sm">
        <summary className="w-fit cursor-pointer rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          Ver datos de la fuente
        </summary>
        <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <Fact label="Acceso">{ACCESS_LABELS[entry.access]}</Fact>
          <Fact label="Actualización esperada">{entry.frequency}</Fact>
          <Fact label="Licencia">{entry.license}</Fact>
          <Fact label="Atribución">{entry.attribution}</Fact>
          <Fact label="Último dato correcto">{lastSuccessAt ? formatHoraBogota(lastSuccessAt) : "Aún sin lectura correcta"}</Fact>
          {flag !== undefined && <Fact label="Interruptor del servidor">{flag ? "Activada" : "Desactivada"}</Fact>}
          {snapshot.detail && <Fact label="Detalle">{snapshot.detail}</Fact>}
          <Fact label="Último error">
            {snapshot.error ? (
              <span>
                <Badge variant="destructive-light" className="me-1.5 align-middle">
                  {ERROR_KIND_LABELS[snapshot.error.kind]}
                </Badge>
                {snapshot.error.message}
              </span>
            ) : (
              "Ninguno"
            )}
          </Fact>
          {href && (
            <Fact label="Fuente oficial">
              <a
                href={href}
                {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="inline-flex items-center gap-1 break-all underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {entry.url}
                {!internal && <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0" />}
              </a>
            </Fact>
          )}
        </dl>
      </details>
    </EventItem>
  );
}
