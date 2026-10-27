"use client";

import { useMemo, useState } from "react";
import { EventItem } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { IndicatorStrip, type Indicator } from "@/components/layouts/indicator-strip";
import { IndicatorsLayout } from "@/components/layouts/indicators-layout";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import type { Observation } from "@/core/domain/observation";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { macroContext } from "@/features/asistente/screen-contexts";
import type { SourceView } from "@/features/entorno/source-view";
import { SOURCES, type SourceInfo } from "@/features/entorno/sources";
import { useEnergy } from "@/features/entorno/use-energy";
import { useExports } from "@/features/entorno/use-exports";
import { useWorldBank } from "@/features/entorno/use-world-bank";
import { AnnualChart } from "./annual-chart";
import { EnergyChart } from "./energy-chart";
import { ExportsChart } from "./exports-chart";
import { formatMillionsUsd, formatPct, formatQuarter, lastTwo } from "./format";
import { observationEvents, type ObservationEvent } from "./observation-events";

type IndicatorId = "pib" | "ipc" | "exports" | "energy";

const COP = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

interface Series {
  id: IndicatorId;
  label: string;
  /** Name of the source as it reads after "consultar". */
  sourceLabel: string;
  view: SourceView;
  observations: readonly Observation[];
  source: SourceInfo;
  provenanceUrl?: string;
  period: (observation: Observation) => string;
  value: (observation: Observation) => string;
  mode: "points" | "percent";
  hint: string;
  emptyText: string;
}

/** Growth, inflation, exports and electricity prices of Colombia: one indicator at a time, with its chart and history (L3). */
export function MacroView() {
  const gdp = useWorldBank("pib");
  const cpi = useWorldBank("ipc_anual");
  const exportsQuery = useExports();
  const energy = useEnergy();
  const [active, setActive] = useState<IndicatorId>("pib");

  const gdpRows = useMemo(() => gdp.data?.observations ?? [], [gdp.data]);
  const cpiRows = useMemo(() => cpi.data?.observations ?? [], [cpi.data]);
  const exportRows = useMemo(() => exportsQuery.data?.observations ?? [], [exportsQuery.data]);
  useRegisterPageContext(
    macroContext({
      gdp: gdpRows,
      cpi: cpiRows,
      exports: exportRows,
      gdpProvenance: gdp.data?.provenance,
      cpiProvenance: cpi.data?.provenance,
      exportsProvenance: exportsQuery.data?.provenance,
    }),
  );

  const series = useMemo<Series[]>(
    () => [
      {
        id: "pib",
        label: "PIB real",
        sourceLabel: "el Banco Mundial (PIB)",
        view: gdp.view,
        observations: gdpRows,
        source: SOURCES.worldBank,
        provenanceUrl: gdp.data?.provenance?.url,
        period: (o) => o.date,
        value: (o) => formatPct(o.value),
        mode: "points",
        hint: "Crecimiento frente al año anterior. Llega con cerca de un año de retraso.",
        emptyText: "El Banco Mundial no devolvió datos del PIB.",
      },
      {
        id: "ipc",
        label: "Inflación anual (IPC)",
        sourceLabel: "el Banco Mundial (IPC)",
        view: cpi.view,
        observations: cpiRows,
        source: SOURCES.worldBank,
        provenanceUrl: cpi.data?.provenance?.url,
        period: (o) => o.date,
        value: (o) => formatPct(o.value),
        mode: "points",
        hint: "Cuánto subieron los precios en el año. Llega con cerca de un año de retraso.",
        emptyText: "El Banco Mundial no devolvió datos del IPC.",
      },
      {
        id: "exports",
        label: "Exportaciones no minero-energéticas",
        sourceLabel: "Exportaciones (datos.gov.co)",
        view: exportsQuery.view,
        observations: exportRows,
        source: SOURCES.exports,
        provenanceUrl: exportsQuery.data?.provenance?.url,
        period: (o) => formatQuarter(o.date),
        value: (o) => formatMillionsUsd(o.value),
        mode: "percent",
        hint: `Total nacional, sin corte por sector. En ${exportRows.at(-1)?.unit ?? "millones de USD"}.`,
        emptyText: "La fuente no devolvió datos de exportaciones.",
      },
      {
        id: "energy",
        label: "Precio de bolsa de energía (XM)",
        sourceLabel: "XM (precio de bolsa de energía)",
        view: energy.view,
        observations: energy.observations,
        source: SOURCES.xm,
        period: (o) => o.date,
        value: (o) => `${COP.format(Math.round(o.value))} COP/kWh`,
        mode: "percent",
        hint: "Electricidad, no gas. Promedio diario del precio de bolsa nacional.",
        emptyText: "XM no devolvió precios de bolsa.",
      },
    ],
    [gdp, cpi, exportsQuery, energy, gdpRows, cpiRows, exportRows],
  );

  // The electricity price is optional: switched off in a deployment, or with nothing to show, it has no slot.
  const visible = series.filter((item) => item.id !== "energy" || (!energy.data?.off && (item.view.status !== "ready" || item.observations.length > 0)));
  const current = visible.find((item) => item.id === active) ?? visible[0];
  const { latest } = lastTwo(current.observations);

  const items: Indicator[] = visible.map((item) => {
    const last = item.observations.at(-1);
    return {
      id: item.id,
      label: item.label,
      value: last ? item.value(last) : null,
      note: last ? item.period(last) : undefined,
      loading: item.view.status === "pending",
    };
  });

  const events = useMemo<ObservationEvent[]>(
    () => observationEvents(current.observations, { mode: current.mode, period: current.period, value: current.value, limit: 14 }),
    [current],
  );

  return (
    <IndicatorsLayout
      notices={<SourceNotices sources={visible.map((item) => ({ name: item.sourceLabel, ...item.view }))} />}
      strip={<IndicatorStrip items={items} selected={current.id} onSelect={(id) => setActive(id as IndicatorId)} />}
      chart={
        <div className="flex flex-col gap-3">
          {current.view.status === "pending" ? null : current.observations.length === 0 ? (
            <RegionEmpty title={current.emptyText} />
          ) : current.id === "pib" || current.id === "ipc" ? (
            <AnnualChart gdp={gdpRows} cpi={cpiRows} />
          ) : current.id === "exports" ? (
            <ExportsChart observations={exportRows} />
          ) : (
            <EnergyChart observations={energy.observations} fetchedAt={energy.view.updatedAt} />
          )}
          {latest && <p className="text-xs text-muted-foreground">{current.hint}</p>}
          {current.id !== "energy" && <ProvenanceNote attribution={current.source.attribution} license={current.source.license} fetchedAt={current.view.updatedAt} />}
        </div>
      }
      eventsLabel="Historial del indicador"
      events={
        <EventList
          flat
          label="Historial"
          items={events}
          getKey={(event) => event.id}
          renderItem={(event) => (
            <EventItem
              title={`${current.label}: ${event.value}`}
              at={event.at}
              source={event.period}
              badge={event.change ? { label: event.change, tone: "neutral" } : undefined}
            />
          )}
        />
      }
    />
  );
}
