"use client";

import { InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EventItem } from "@/components/events/event-item";
import { REGULATION_ORIGIN_ICONS } from "@/components/events/event-icons";
import { EventList } from "@/components/events/event-list";
import { FeedSummary } from "@/components/events/feed-summary";
import { FeedLayout } from "@/components/layouts/feed-layout";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RegulationEntry, RegulationItem } from "@/core/domain/regulation";
import { bogotaDateKey } from "@/core/time/bogota";
import { useCuratedNorms, useRegulation } from "@/features/entorno/use-regulation";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { formatDiaBogota } from "@/lib/date";

export type Origin = "curated" | "minambiente" | "decree";

const ORIGIN_LABELS: Record<Origin, string> = {
  curated: "Normas curadas",
  minambiente: "Minambiente",
  decree: "Decretos de Presidencia",
};

interface Entry {
  id: string;
  origin: Origin;
  at: string;
  title: string;
  source: string;
  topic?: string;
  detail?: string;
  why?: string;
  href?: string;
  curated?: boolean;
}

const fromNorm = (norm: RegulationEntry): Entry => ({
  id: `curated:${norm.id}`,
  origin: "curated",
  at: `${norm.date}T12:00:00.000Z`,
  title: norm.name,
  source: "Norma curada",
  topic: norm.topic,
  why: norm.whyItMatters,
  detail: `Revisada el ${formatDiaBogota(`${norm.reviewedAt}T12:00:00.000Z`)}.${norm.url ? "" : " Sin enlace oficial verificado todavía."}`,
  href: norm.url ?? undefined,
  curated: true,
});

const fromItem = (item: RegulationItem): Entry => ({
  id: item.id,
  origin: item.kind === "decree" ? "decree" : "minambiente",
  at: item.publishedAt,
  title: item.title,
  source: item.kind === "decree" ? "Presidencia" : "Minambiente",
  topic: item.kind === "decree" ? "Decreto" : "Publicación",
  detail: item.summary,
  href: item.url,
});

/** Norms that affect the company: hand-picked ones, Minambiente publications and Presidencia decrees (L1). */
export function RegulacionView() {
  const norms = useCuratedNorms();
  const regulation = useRegulation();
  const { view, data } = regulation;
  const { values, set, clear: clearValues, active } = useFilterValues({ origin: "" });
  const [dates, setDates] = useState<DayRange | undefined>();

  const entries = useMemo<Entry[]>(
    () =>
      [...norms.map(fromNorm), ...regulation.items.map(fromItem)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)),
    [norms, regulation.items],
  );
  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (values.origin && entry.origin !== values.origin) return false;
        if (!dates) return true;
        const day = bogotaDateKey(entry.at);
        return day >= dates.fromDate && day <= dates.toDate;
      }),
    [entries, values, dates],
  );
  const clear = () => {
    clearValues();
    setDates(undefined);
  };

  const origins = (Object.keys(ORIGIN_LABELS) as Origin[]).filter((origin) => origin !== "curated" || norms.length > 0);
  const counts = origins.map((origin) => ({ value: origin, label: ORIGIN_LABELS[origin], count: entries.filter((entry) => entry.origin === origin).length, icon: REGULATION_ORIGIN_ICONS[origin] }));
  const blocks = [
    { name: "Minambiente", block: data?.minambiente },
    { name: "Presidencia", block: data?.presidencia },
  ];
  const pending = view.status === "pending";
  const nothing = !pending && view.status !== "error" && entries.length === 0;

  return (
    <FeedLayout
      filters={
        <FilterBar active={active || dates !== undefined} onClear={clear}>
          <FilterSelect label="Fuente" value={values.origin} options={counts.map(({ value, label }) => ({ value, label }))} onChange={(value) => set("origin", value)} />
          <DateRangeFilter value={dates} onChange={setDates} label="Período" />
        </FilterBar>
      }
      notices={
        <div className="flex shrink-0 flex-col gap-2">
          <SourceNotices sources={[{ name: "Regulación", ...view }]} />
          {data?.off && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Fuente desactivada: Regulación</AlertTitle>
              <AlertDescription>Esta fuente está apagada en este despliegue. Un administrador puede volver a encenderla.</AlertDescription>
            </Alert>
          )}
          {blocks.map(({ name, block }) =>
            block?.status === "disabled" && !data?.off ? (
              <Alert key={name}>
                <InfoIcon />
                <AlertTitle>Fuente desactivada: {name}</AlertTitle>
                <AlertDescription>Esta fuente está apagada en este despliegue. Un administrador puede volver a encenderla.</AlertDescription>
              </Alert>
            ) : block?.status === "error" ? (
              <ErrorState key={name} source={name} message={block.message ?? "La fuente no respondió."} onRetry={view.retry} othersKeepWorking />
            ) : null,
          )}
        </div>
      }
      asideLabel="Resumen de regulación"
      aside={!pending && <FeedSummary total={entries.length} totalLabel={entries.length === 1 ? "publicación" : "publicaciones"} groups={[{ title: "Por fuente", selected: values.origin, onSelect: (value) => set("origin", value), options: counts }]} />}
    >
      {pending && norms.length === 0 ? (
        <EventListSkeleton label="Consultando Minambiente y Presidencia" />
      ) : nothing || filtered.length === 0 ? (
        pending ? null : (
          <RegionEmpty
            title={nothing ? "No hay publicaciones recientes" : "Ninguna publicación cumple estos filtros"}
            description={nothing ? "Minambiente y Presidencia no trajeron novedades con las palabras clave de la empresa." : "Quite un filtro para ver más."}
            action={!nothing && (active || dates) ? { label: "Limpiar filtros", onClick: clear } : undefined}
          />
        )
      ) : (
        <>
          {pending && <EventListSkeleton label="Consultando Minambiente y Presidencia" rows={2} />}
          <EventList
            label="Regulación"
            items={filtered}
            getKey={(entry) => entry.id}
            renderItem={(entry) => {
              const OriginIcon = REGULATION_ORIGIN_ICONS[entry.origin];
              return (
              <EventItem
                media={<OriginIcon aria-hidden="true" />}
                title={entry.title}
                at={entry.at}
                source={entry.source}
                topic={entry.topic}
                badge={entry.curated ? { label: "Curado manualmente", tone: "low" } : undefined}
                detail={entry.detail}
                why={entry.why}
                href={entry.href}
              />
              );
            }}
          />
          <div className="flex flex-col gap-1 px-3 py-2">
            {norms.length > 0 && <ProvenanceNote attribution="Curado manualmente por el equipo del prototipo" license="Resumen propio; el texto de cada norma es público" />}
            {data?.minambiente.status === "ok" && (
              <ProvenanceNote attribution="Ministerio de Ambiente y Desarrollo Sostenible" license="Solo titular, fecha y enlace (derechos del Ministerio)" fetchedAt={view.updatedAt} />
            )}
            {data?.presidencia.status === "ok" && (
              <ProvenanceNote
                attribution="Departamento Administrativo de la Presidencia de la República (DAPRE) vía datos.gov.co"
                license="CC BY-SA 4.0"
                fetchedAt={view.updatedAt}
              />
            )}
          </div>
        </>
      )}
    </FeedLayout>
  );
}
