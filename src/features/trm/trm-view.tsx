"use client";

import { DownloadIcon, StarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EventItem } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { IndicatorStrip } from "@/components/layouts/indicator-strip";
import { FilterBar } from "@/components/layouts/filter-bar";
import { IndicatorsLayout } from "@/components/layouts/indicators-layout";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { floatingToBogotaIso } from "@/core/time/bogota";
import { useAlertas } from "@/features/avisos/use-alertas";
import { SOURCES } from "@/features/entorno/sources";
import { exportarCsv } from "@/lib/csv";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Delta } from "./delta";
import { PeriodoSelect } from "./periodo";
import { TrmChart } from "./trm-chart";
import { TrmData } from "./trm-data";
import type { PuntoTrm } from "./types";
import { useTrmThreshold } from "./use-trm";

const SIGNED = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });

/** The day as an instant in Bogota time, falling back to the raw text when it has no known shape. */
const atOf = (punto: PuntoTrm) => floatingToBogotaIso(punto.fecha) ?? punto.fecha;

/** The dollar (TRM): today's value, the series, and every day of the period as an event (L3). */
export function TrmView() {
  return (
    <TrmData
      loading={
        <div role="status" aria-label="Consultando la TRM en datos.gov.co" className="flex flex-col gap-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {(datos) => <TrmPanel datos={datos} />}
    </TrmData>
  );
}

function TrmPanel({ datos }: { datos: PuntoTrm[] }) {
  const umbral = useTrmThreshold();
  const { estaGuardado, alternar } = useAlertas();
  const [soloAtipicos, setSoloAtipicos] = useState(false);

  const ultimo = datos.at(-1);
  const anterior = datos.at(-2);
  const atipicos = datos.filter((punto) => punto.atipico).length;
  const dias = useMemo(() => {
    const lista = soloAtipicos ? datos.filter((punto) => punto.atipico) : datos;
    return [...lista].reverse().map((punto) => ({ punto, at: atOf(punto) }));
  }, [datos, soloAtipicos]);

  return (
    <IndicatorsLayout
      period={
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">Período</span>
          <PeriodoSelect />
        </div>
      }
      strip={
        <IndicatorStrip
          items={[
            {
              id: "hoy",
              label: "TRM hoy (precio oficial del dólar)",
              value: ultimo ? formatCop(ultimo.valor) : null,
              note: ultimo ? <Delta value={ultimo.variacionPct} against="frente al día anterior" /> : undefined,
            },
            { id: "anterior", label: "Día anterior", value: anterior ? formatCop(anterior.valor) : null, note: anterior ? formatFecha(anterior.fecha) : undefined },
            { id: "atipicos", label: `Días con variación de ${umbral} % o más`, value: String(atipicos) },
          ]}
        />
      }
      chart={
        <div className="flex flex-col gap-2">
          <TrmChart datos={datos} />
          <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} />
        </div>
      }
      eventsLabel="Días y variaciones"
      events={
        <div className="flex flex-col gap-2">
          <FilterBar
            active={soloAtipicos}
            onClear={() => setSoloAtipicos(false)}
            trailing={
              <Button variant="outline" size="sm" disabled={dias.length === 0} onClick={() => exportarCsv(dias.map(({ punto }) => punto), "trm.csv")}>
                <DownloadIcon aria-hidden="true" data-icon="inline-start" />
                Exportar CSV
              </Button>
            }
          >
            <Label className="gap-2 text-sm font-normal">
              <Checkbox checked={soloAtipicos} onCheckedChange={(marcado) => setSoloAtipicos(marcado === true)} />
              Solo variaciones de {umbral} % o más
            </Label>
          </FilterBar>

          {dias.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Ningún día coincide con este filtro.</p>
          ) : (
            <EventList
              flat
              label="Días de la TRM"
              items={dias}
              getKey={({ punto }) => punto.fecha}
              renderItem={({ punto, at }) => {
                const guardada = estaGuardado(punto.fecha);
                return (
                  <EventItem
                    title={`TRM ${formatCop(punto.valor)}`}
                    at={at}
                    source="TRM"
                    topic={punto.atipico ? "Variación atípica" : undefined}
                    badge={punto.variacionPct === null ? undefined : { label: `${SIGNED.format(punto.variacionPct)} %`, tone: punto.atipico ? "medium" : "neutral" }}
                    actions={
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={guardada}
                        aria-label={`${guardada ? "Quitar de" : "Guardar en"} avisos el ${formatFecha(punto.fecha)}`}
                        onClick={() => alternar(punto.fecha)}
                      >
                        <StarIcon aria-hidden="true" data-icon="inline-start" className={cn(guardada && "fill-current text-warning")} />
                        {guardada ? "Guardado" : "Guardar"}
                      </Button>
                    }
                  />
                );
              }}
            />
          )}
        </div>
      }
    />
  );
}
