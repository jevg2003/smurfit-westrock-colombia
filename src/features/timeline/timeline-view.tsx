"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { timelineContext } from "@/features/asistente/screen-contexts";
import { useMemo, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { createFilterQuery } from "@/components/reui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/reui/filters/filters-types";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPETITORS } from "@/content/config/empresa";
import type { Signal } from "@/core/domain/signal";
import { DIMENSION_LABELS } from "@/core/labels";
import { contractSubject, isFollowed, signalSubject } from "@/core/rules/watch-subject";
import { bogotaDateKey } from "@/core/time/bogota";
import { buildTimeline, type TimelineEvent } from "@/core/usecases/build-timeline";
import { useNews } from "@/features/entorno/use-news";
import { useRegulation } from "@/features/entorno/use-regulation";
import { useSignals } from "@/features/entorno/use-signals";
import { SOURCES } from "@/features/entorno/sources";
import { applyFilters } from "@/features/filtros/apply-filters";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { SelectFilters } from "@/features/filtros/select-filters";
import { DimensionBadge, SeverityBadge } from "@/features/senales/badges";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { SignalDetailSheet } from "@/features/senales/signal-detail-sheet";
import { useWatchlistStore } from "@/stores/watchlist.store";
import { formatDiaBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";

const PAGE_SIZE = 30;

const KIND_LABELS: Record<TimelineEvent["kind"], string> = {
  signal: "Señal",
  contract: "Contrato",
  news: "Noticia",
  regulation: "Norma",
};

const FIELDS: FilterField[] = [
  {
    id: "dimension",
    label: "Dimensión",
    type: "select",
    options: Object.entries(DIMENSION_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    id: "kind",
    label: "Tipo de evento",
    type: "select",
    options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const ACCESSORS = {
  dimension: (event: TimelineEvent) => event.dimension,
  kind: (event: TimelineEvent) => event.kind,
};

/** What happened and in what order, across every dimension that is connected today. */
export function TimelineView() {
  const data = useSignals();
  const news = useNews();
  const regulation = useRegulation();
  const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery());
  const [dates, setDates] = useState<DayRange | undefined>();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<Signal | null>(null);
  const range = dates;

  const events = useMemo(
    () =>
      buildTimeline({
        signals: data.signals,
        contracts: data.contracts,
        // Only headlines that mention the user's terms, so the timeline is not flooded.
        news: news.items.filter((item) => item.matches.length > 0),
        regulations: [],
        regulationItems: regulation.items,
        competitorNits: COMPETITORS.map((competitor) => competitor.nit),
      }),
    [data.signals, data.contracts, news.items, regulation.items],
  );

  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);
  const signalsById = useMemo(() => new Map(data.signals.map((signal) => [`signal:${signal.id}`, signal])), [data.signals]);

  const filtered = useMemo(() => {
    let result = applyFilters(events, query, ACCESSORS);
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
    if (!range) return result;
    return result.filter((event) => {
      const day = bogotaDateKey(event.at);
      return day >= range.fromDate && day <= range.toDate;
    });
  }, [events, query, range, onlyFollowed, competitorNits, indicators, data.contracts, signalsById]);

  const shown = filtered.slice(0, visible);
  const isFiltering = filtered.length !== events.length;
  useRegisterPageContext(timelineContext(filtered, events.length, { "solo mis seguimientos": onlyFollowed ? "sí" : undefined }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Línea de tiempo"
        description="Señales, contratos, noticias con tus términos y publicaciones de regulación en orden, del más reciente al más antiguo."
        actions={<FollowedFilterToggle />}
      />

      <div className="flex flex-col gap-2">
        {data.trm.status === "error" && (
          <ErrorState source="la TRM" message={data.trm.errorMessage ?? "Error desconocido."} kind={data.trm.errorKind} onRetry={data.trm.retry} />
        )}
        {data.secop.status === "error" && (
          <ErrorState source="SECOP II" message={data.secop.errorMessage ?? "Error desconocido."} kind={data.secop.errorKind} onRetry={data.secop.retry} />
        )}
        {data.trm.isStale && <StaleNotice source="la TRM" updatedAt={data.trm.updatedAt} />}
        {data.secop.isStale && <StaleNotice source="SECOP II" updatedAt={data.secop.updatedAt} />}
      </div>

      {data.isPending ? (
        <Skeleton role="status" aria-label="Consultando las fuentes" className="h-96 rounded-xl" />
      ) : (
        <Card className="min-w-0 gap-0 py-0">
          <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <SelectFilters
                fields={FIELDS}
                query={query}
                onQueryChange={(next) => {
                  setQuery(next);
                  setVisible(PAGE_SIZE);
                }}
              />
            </div>
            <div className="shrink-0">
              <DateRangeFilter value={dates} onChange={setDates} label="Fecha del evento" />
            </div>
          </div>

          <CardContent className="py-4">
            {filtered.length === 0 ? (
              <Empty className="border-0 p-6">
                <EmptyHeader>
                  <EmptyTitle>No hay eventos para mostrar</EmptyTitle>
                  <EmptyDescription>
                    {isFiltering
                      ? "Ningún evento cumple estos filtros o tu lista de seguimiento. Quita alguno para ver más."
                      : "Todavía no hay señales ni contratos con los datos de hoy."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Timeline value={0}>
                {shown.map((event, index) => {
                  const url = safeHttpUrl(event.url);
                  const signal = signalsById.get(event.id);
                  return (
                    <TimelineItem key={event.id} step={index + 1}>
                      <TimelineHeader>
                        <TimelineDate dateTime={event.at}>{formatDiaBogota(event.at)}</TimelineDate>
                        <TimelineTitle className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
                          <span className="min-w-0 break-words">{event.title}</span>
                        </TimelineTitle>
                      </TimelineHeader>
                      <TimelineIndicator />
                      <TimelineSeparator />
                      <TimelineContent className="flex flex-col gap-2">
                        {event.detail && <p className="break-words">{event.detail}</p>}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" size="sm">
                            {KIND_LABELS[event.kind]}
                          </Badge>
                          <DimensionBadge dimension={event.dimension} />
                          {event.severity && <SeverityBadge severity={event.severity} />}
                          {signal && (
                            <Button variant="ghost" size="xs" onClick={() => setOpen(signal)}>
                              Ver detalle
                            </Button>
                          )}
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              Ver registro original
                              <ExternalLinkIcon aria-hidden="true" className="size-3" />
                            </a>
                          )}
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            )}
            {filtered.length > visible && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
                  Mostrar más ({filtered.length - visible})
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col items-start gap-1 border-t bg-muted/50 px-4 py-2">
            <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} fetchedAt={data.trm.updatedAt} />
            <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={data.secop.updatedAt} />
          </CardFooter>
        </Card>
      )}

      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </div>
  );
}
