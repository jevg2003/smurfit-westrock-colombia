"use client";

import { CircleDollarSignIcon, GlobeIcon, PercentIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { macroContext } from "@/features/asistente/screen-contexts";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { StatCard } from "@/components/shell/stat-card";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Skeleton } from "@/components/ui/skeleton";
import type { Observation } from "@/core/domain/observation";
import type { SourceView } from "@/features/entorno/source-view";
import { SOURCES, type SourceInfo } from "@/features/entorno/sources";
import { useEnergy } from "@/features/entorno/use-energy";
import { useExports } from "@/features/entorno/use-exports";
import { useWorldBank, type ObservationsData } from "@/features/entorno/use-world-bank";
import { Delta } from "@/features/trm/delta";
import { PeriodoSelect } from "@/features/trm/periodo";
import { TrmChart } from "@/features/trm/trm-chart";
import { TrmData } from "@/features/trm/trm-data";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { AnnualChart } from "./annual-chart";
import { EnergyChart } from "./energy-chart";
import { ExportsChart } from "./exports-chart";
import { formatMillionsUsd, formatPct, formatQuarter, lastTwo } from "./format";

interface MetricProps {
  view: SourceView;
  data?: ObservationsData;
  source: SourceInfo;
  /** Name of the source for error messages, for example "el Banco Mundial (PIB)". */
  sourceLabel: string;
  icon: LucideIcon;
  label: string;
  /** Text under the value, given the latest and previous observations. */
  hint: (latest: Observation, previous: Observation | undefined) => ReactNode;
  period: (observation: Observation) => string;
  value: (observation: Observation) => string;
  emptyText: string;
}

/** One stat card with its own loading, error, stale and empty states, and its provenance line. */
function MetricCard({ view, data, source, sourceLabel, icon, label, hint, period, value, emptyText }: MetricProps) {
  if (view.status === "pending") {
    return <Skeleton role="status" aria-label={`Consultando ${sourceLabel}`} className="h-44 rounded-xl" />;
  }
  if (view.status === "error") {
    return <ErrorState source={sourceLabel} message={view.errorMessage ?? "Error desconocido."} onRetry={view.retry} />;
  }

  const { latest, previous } = lastTwo(data?.observations ?? []);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <StatCard
        icon={icon}
        label={label}
        meta={latest ? period(latest) : undefined}
        value={latest ? value(latest) : "Sin dato"}
        hint={latest ? undefined : emptyText}
        action={{ label: "Ver la fuente original", href: data?.provenance?.url ?? "/macro" }}
      >
        <div className="flex flex-col gap-1">
          {latest && <span className="text-xs text-muted-foreground">{hint(latest, previous)}</span>}
          <ProvenanceNote attribution={source.attribution} license={source.license} fetchedAt={view.updatedAt} />
        </div>
      </StatCard>
      {view.isStale && <StaleNotice source={sourceLabel} updatedAt={view.updatedAt} />}
    </div>
  );
}

function TrmSection() {
  return (
    <TrmData loading={<Skeleton role="status" aria-label="Consultando la TRM en datos.gov.co" className="h-72 rounded-xl" />}>
      {(datos) => {
        const ultimo = datos.at(-1);
        const anterior = datos.at(-2);
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TrmChart datos={datos} />
            <StatCard
              icon={CircleDollarSignIcon}
              label="TRM hoy"
              meta={ultimo ? formatFecha(ultimo.fecha) : undefined}
              value={ultimo ? formatCop(ultimo.valor) : "Sin dato"}
              delta={ultimo ? <Delta value={ultimo.variacionPct} against="frente al día anterior" /> : undefined}
              hint={anterior ? `Día anterior: ${formatCop(anterior.valor)}` : undefined}
              action={{ label: "Ver días y variaciones", href: "/dias" }}
            >
              <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} />
            </StatCard>
          </div>
        );
      }}
    </TrmData>
  );
}

/** Spot electricity price (XM) with its own loading, error, stale and switched-off states. */
function EnergySection({ energy }: { energy: ReturnType<typeof useEnergy> }) {
  const { view, data, observations } = energy;
  if (data?.off) return null;
  if (view.status === "pending") {
    return <Skeleton role="status" aria-label="Consultando XM (precio de bolsa de energía)" className="h-72 rounded-xl" />;
  }
  if (view.status === "error") {
    return <ErrorState source="XM (precio de bolsa de energía)" message={view.errorMessage ?? "Error desconocido."} onRetry={view.retry} />;
  }
  if (observations.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <EnergyChart observations={observations} fetchedAt={view.updatedAt} />
      {view.isStale && <StaleNotice source="XM (precio de bolsa de energía)" updatedAt={view.updatedAt} />}
    </div>
  );
}

function previousYearHint(lead: string) {
  return (_: Observation, previous: Observation | undefined) =>
    previous ? `${lead} Año anterior (${previous.date}): ${formatPct(previous.value)}` : lead;
}

/** Dollar, GDP, inflation and exports of Colombia in one place. */
export function MacroView() {
  const gdp = useWorldBank("pib");
  const cpi = useWorldBank("ipc_anual");
  const exportsQuery = useExports();
  const energy = useEnergy();

  const gdpRows = gdp.data?.observations ?? [];
  const cpiRows = cpi.data?.observations ?? [];
  const exportRows = exportsQuery.data?.observations ?? [];
  const showAnnual = gdpRows.length > 0 || cpiRows.length > 0;
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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Macroeconomía"
        description="El dólar, el crecimiento de la economía, la inflación y las exportaciones de Colombia. El PIB y la inflación son anuales y llegan con cerca de un año de retraso."
        actions={<PeriodoSelect />}
      />

      <TrmSection />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 xl:gap-3">
        <MetricCard
          view={gdp.view}
          data={gdp.data}
          source={SOURCES.worldBank}
          sourceLabel="el Banco Mundial (PIB)"
          icon={TrendingUpIcon}
          label="PIB real"
          period={(o) => o.date}
          value={(o) => formatPct(o.value)}
          hint={previousYearHint("Crecimiento frente al año anterior.")}
          emptyText="El Banco Mundial no devolvió datos del PIB."
        />
        <MetricCard
          view={cpi.view}
          data={cpi.data}
          source={SOURCES.worldBank}
          sourceLabel="el Banco Mundial (IPC)"
          icon={PercentIcon}
          label="Inflación anual (IPC)"
          period={(o) => o.date}
          value={(o) => formatPct(o.value)}
          hint={previousYearHint("Cuánto subieron los precios en el año.")}
          emptyText="El Banco Mundial no devolvió datos del IPC."
        />
        <MetricCard
          view={exportsQuery.view}
          data={exportsQuery.data}
          source={SOURCES.exports}
          sourceLabel="Exportaciones (datos.gov.co)"
          icon={GlobeIcon}
          label="Exportaciones no minero-energéticas"
          period={(o) => formatQuarter(o.date)}
          value={(o) => formatMillionsUsd(o.value)}
          hint={(latest) => `Total nacional, sin corte por sector. En ${latest.unit}.`}
          emptyText="La fuente no devolvió datos de exportaciones."
        />
      </div>

      <EnergySection energy={energy} />

      {(showAnnual || exportRows.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showAnnual && <AnnualChart gdp={gdpRows} cpi={cpiRows} />}
          {exportRows.length > 0 && <ExportsChart observations={exportRows} />}
        </div>
      )}
    </div>
  );
}
