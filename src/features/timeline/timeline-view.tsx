"use client";

import { useMemo, useState } from "react";
import { EventItem, type EventTone } from "@/components/events/event-item";
import { TIMELINE_KIND_ICONS } from "@/components/events/event-icons";
import { EventList } from "@/components/events/event-list";
import { FeedSummary } from "@/components/events/feed-summary";
import { FeedLayout } from "@/components/layouts/feed-layout";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Button } from "@/components/ui/button";
import { withNitCompetitors } from "@/core/company/profile";
import type { Severity } from "@/core/domain/dimension";
import type { Signal } from "@/core/domain/signal";
import { DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { contractSubject, isFollowed, signalSubject } from "@/core/rules/watch-subject";
import { bogotaDateKey } from "@/core/time/bogota";
import { buildTimeline, type TimelineEvent } from "@/core/usecases/build-timeline";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { timelineContext } from "@/features/asistente/screen-contexts";
import { SignalDetailSheet } from "@/features/avisos/signal-detail-sheet";
import { SOURCES } from "@/features/entorno/sources";
import { useNews } from "@/features/entorno/use-news";
import { useRegulation } from "@/features/entorno/use-regulation";
import { useSignals } from "@/features/entorno/use-signals";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { useCompany } from "@/stores/companies.store";
import { useWatchlistStore } from "@/stores/watchlist.store";

const PAGE_SIZE = 30;

const KIND_LABELS: Record<TimelineEvent["kind"], string> = {
  signal: "Aviso",
  contract: "Contrato",
  news: "Noticia",
  regulation: "Norma",
};

const SEVERITY_TONE: Record<Severity, EventTone> = { alert: "high", watch: "medium", info: "low" };
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** What happened and in what order, across every dimension that is connected today (L1). */
export function TimelineView() {
  const data = useSignals();
  const news = useNews();
  const regulation = useRegulation();
  const { values, set, clear: clearValues, active } = useFilterValues({ kind: "", dimension: "" });
  const [dates, setDates] = useState<DayRange | undefined>();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<Signal | null>(null);
  const company = useCompany();

  const events = useMemo(
    () =>
      buildTimeline({
        signals: data.signals,
        contracts: data.contracts,
        // Only headlines that mention the terms of the company, so the timeline is not flooded.
        news: news.items.filter((item) => item.matches.length > 0),
        regulations: [],
        regulationItems: regulation.items,
        competitorNits: withNitCompetitors(company).map((competitor) => competitor.nit),
      }),
    [company, data.signals, data.contracts, news.items, regulation.items],
  );

  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);
  const signalsById = useMemo(() => new Map(data.signals.map((signal) => [`signal:${signal.id}`, signal])), [data.signals]);

  const filtered = useMemo(() => {
    let result = events.filter((event) => (!values.kind || event.kind === values.kind) && (!values.dimension || event.dimension === values.dimension));
    if (onlyFollowed) {
      const supplierNitByContractId = new Map(data.contracts.map((contract) => [contract.id, contract.supplierNit]));
      const contractsById = new Map(data.contracts.map((contract) => [`contract:${contract.id}`, contract]));
      const watchlist = { competitorNits, indicators };
      // News and regulation have no competitor or indicator, so they stay out of a "followed only" view.
      result = result.filter((event) => {
        const signal = signalsById.get(event.id);
        if (signal) return isFollowed(signalSubject(signal, supplierNitByContractId), watchlist);
        const contract = contractsById.get(event.id);
        return contract ? isFollowed(contractSubject(contract), watchlist) : false;
      });
    }
    if (!dates) return result;
    return result.filter((event) => {
      const day = bogotaDateKey(event.at);
      return day >= dates.fromDate && day <= dates.toDate;
    });
  }, [events, values, dates, onlyFollowed, competitorNits, indicators, data.contracts, signalsById]);

  const shown = filtered.slice(0, visible);
  const isFiltering = filtered.length !== events.length;
  const clear = () => {
    clearValues();
    setDates(undefined);
    setVisible(PAGE_SIZE);
  };
  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
    return [...counts].map(([value, count]) => ({ value, label: KIND_LABELS[value as TimelineEvent["kind"]], count }));
  }, [events]);
  useRegisterPageContext(timelineContext(filtered, events.length, { "solo lo que sigo": onlyFollowed ? "sí" : undefined }));

  return (
    <>
      <FeedLayout
        filters={
          <FilterBar active={active || dates !== undefined} onClear={clear}>
            <FilterSelect label="Tipo" value={values.kind} options={options(KIND_LABELS)} onChange={(value) => (set("kind", value), setVisible(PAGE_SIZE))} />
            <FilterSelect label="Tema" value={values.dimension} options={options(DIMENSION_LABELS)} onChange={(value) => (set("dimension", value), setVisible(PAGE_SIZE))} />
            <DateRangeFilter value={dates} onChange={setDates} label="Período" />
            <FollowedFilterToggle />
          </FilterBar>
        }
        notices={<SourceNotices sources={[{ name: "la TRM", ...data.trm }, { name: "SECOP II", ...data.secop }]} />}
        asideLabel="Resumen de la línea de tiempo"
        aside={
          !data.isPending && (
            <FeedSummary
              total={filtered.length}
              totalLabel={filtered.length === 1 ? "evento" : "eventos"}
              groups={[{ title: "Por tipo", selected: values.kind, onSelect: (value) => set("kind", value), options: kindCounts }]}
            />
          )
        }
      >
        {data.isPending ? (
          <EventListSkeleton label="Consultando las fuentes" />
        ) : filtered.length === 0 ? (
          <RegionEmpty
            title="No hay eventos para mostrar"
            description={
              isFiltering ? "Ningún evento cumple estos filtros o su lista de seguimiento. Quite alguno para ver más." : "Todavía no hay avisos ni contratos con los datos de hoy."
            }
            action={isFiltering ? { label: "Limpiar filtros", onClick: clear } : undefined}
          />
        ) : (
          <>
            <EventList
              label="Eventos"
              items={shown}
              getKey={(event) => event.id}
              renderItem={(event) => {
                const signal = signalsById.get(event.id);
                const KindIcon = TIMELINE_KIND_ICONS[event.kind];
                return (
                  <EventItem
                    media={<KindIcon aria-hidden="true" />}
                    title={event.title}
                    at={event.at}
                    source={KIND_LABELS[event.kind]}
                    topic={DIMENSION_LABELS[event.dimension]}
                    badge={event.severity ? { label: SEVERITY_LABELS[event.severity], tone: SEVERITY_TONE[event.severity] } : undefined}
                    detail={event.detail}
                    href={event.url}
                    onOpen={signal ? () => setOpen(signal) : undefined}
                  />
                );
              }}
            />
            {filtered.length > visible && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
                  Mostrar más ({filtered.length - visible})
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-1 px-3 py-2">
              <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} fetchedAt={data.trm.updatedAt} />
              <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={data.secop.updatedAt} />
            </div>
          </>
        )}
      </FeedLayout>
      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </>
  );
}
