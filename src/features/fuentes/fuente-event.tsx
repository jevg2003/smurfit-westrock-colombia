import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CopyrightIcon,
  ExternalLinkIcon,
  InfoIcon,
  KeyRoundIcon,
  LinkIcon,
  type LucideIcon,
  RefreshCwIcon,
  ScaleIcon,
  ToggleRightIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { EventItem, type EventTone } from "@/components/events/event-item";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
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

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <Item size="xs" className="items-start">
      <ItemMedia variant="icon">
        <Icon aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemDescription>{label}</ItemDescription>
        <ItemTitle className="min-w-0 break-words font-normal">{children}</ItemTitle>
      </ItemContent>
    </Item>
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
      <Collapsible>
        <CollapsibleTrigger className="flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          Ver datos de la fuente
          <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0 transition-transform in-aria-expanded:rotate-180 motion-reduce:transition-none" />
        </CollapsibleTrigger>
        <CollapsibleContent keepMounted className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          <ItemGroup className="mt-2 gap-0">
            <Fact icon={KeyRoundIcon} label="Acceso">{ACCESS_LABELS[entry.access]}</Fact>
            <ItemSeparator />
            <Fact icon={RefreshCwIcon} label="Actualización esperada">{entry.frequency}</Fact>
            <ItemSeparator />
            <Fact icon={ScaleIcon} label="Licencia">{entry.license}</Fact>
            <ItemSeparator />
            <Fact icon={CopyrightIcon} label="Atribución">{entry.attribution}</Fact>
            <ItemSeparator />
            <Fact icon={CircleCheckIcon} label="Último dato correcto">{lastSuccessAt ? formatHoraBogota(lastSuccessAt) : "Aún sin lectura correcta"}</Fact>
            {flag !== undefined && (
              <>
                <ItemSeparator />
                <Fact icon={ToggleRightIcon} label="Interruptor del servidor">{flag ? "Activada" : "Desactivada"}</Fact>
              </>
            )}
            {snapshot.detail && (
              <>
                <ItemSeparator />
                <Fact icon={InfoIcon} label="Detalle">{snapshot.detail}</Fact>
              </>
            )}
            <ItemSeparator />
            <Fact icon={TriangleAlertIcon} label="Último error">
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
              <>
                <ItemSeparator />
                <Item
                  size="xs"
                  className="items-start"
                  render={<a href={href} {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })} />}
                >
                  <ItemMedia variant="icon">
                    <LinkIcon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription>Fuente oficial</ItemDescription>
                    <ItemTitle className="min-w-0 break-all font-normal">{entry.url}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    {internal ? <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" /> : <ExternalLinkIcon aria-hidden="true" className="size-4 text-muted-foreground" />}
                    {!internal && <span className="sr-only">(se abre en una pestaña nueva)</span>}
                  </ItemActions>
                </Item>
              </>
            )}
          </ItemGroup>
        </CollapsibleContent>
      </Collapsible>
    </EventItem>
  );
}
