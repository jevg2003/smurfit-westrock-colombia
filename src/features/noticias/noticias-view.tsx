"use client";

import { InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EventItem } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { FeedSummary } from "@/components/events/feed-summary";
import { FeedLayout } from "@/components/layouts/feed-layout";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { Badge } from "@/components/reui/badge";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { NewsItem } from "@/core/domain/news";
import { bogotaDateKey } from "@/core/time/bogota";
import { useNews } from "@/features/entorno/use-news";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";

const PAGE_SIZE = 30;

/** Headlines are matched against the term groups of Configuración; here they can be narrowed further. */
function matches(item: NewsItem, { outlet, group }: { outlet: string; group: string }): boolean {
  if (outlet && item.outlet !== outlet) return false;
  if (group && !item.matches.some((match) => match.groupId === group)) return false;
  return true;
}

/** Headlines from Colombian media and Google News that mention the company, its sector or its risks (L1). */
export function NoticiasView() {
  const news = useNews();
  const { values, set, clear: clearValues, active } = useFilterValues({ outlet: "", group: "", show: "" });
  const [dates, setDates] = useState<DayRange | undefined>();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const outlets = useMemo(() => [...new Set(news.items.map((item) => item.outlet))].sort().map((outlet) => ({ value: outlet, label: outlet })), [news.items]);
  const groupOptions = useMemo(() => news.groups.map((group) => ({ value: group.id, label: group.label })), [news.groups]);
  const pool = values.show === "all" ? news.items : news.relevantItems;

  const filtered = useMemo(
    () =>
      pool.filter((item) => {
        if (!matches(item, values)) return false;
        if (!dates) return true;
        const day = bogotaDateKey(item.publishedAt);
        return day >= dates.fromDate && day <= dates.toDate;
      }),
    [pool, values, dates],
  );

  const groupCounts = useMemo(
    () =>
      news.groups
        .map((group) => ({ value: group.id, label: group.label, count: news.relevantItems.filter((item) => item.matches.some((match) => match.groupId === group.id)).length }))
        .filter((option) => option.count > 0),
    [news.groups, news.relevantItems],
  );

  const { view, data } = news;
  const problems = (data?.feeds ?? []).filter((feed) => feed.status !== "ok");
  const shown = filtered.slice(0, visible);
  const clear = () => {
    clearValues();
    setDates(undefined);
    setVisible(PAGE_SIZE);
  };
  const changed = (key: "outlet" | "group" | "show") => (value: string) => {
    set(key, value);
    setVisible(PAGE_SIZE);
  };

  return (
    <FeedLayout
      filters={
        <FilterBar active={active || dates !== undefined} onClear={clear}>
          <FilterSelect label="Medio" value={values.outlet} options={outlets} onChange={changed("outlet")} />
          <FilterSelect label="Tema" value={values.group} options={groupOptions} onChange={changed("group")} />
          <FilterSelect label="Mostrar" value={values.show} options={[{ value: "all", label: "Todas las noticias" }]} allLabel="Solo relevantes" onChange={changed("show")} />
          <DateRangeFilter value={dates} onChange={setDates} label="Período" />
        </FilterBar>
      }
      notices={
        <div className="flex shrink-0 flex-col gap-2">
          <SourceNotices sources={[{ name: "Noticias", ...view }]} />
          {data?.off && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Fuente desactivada</AlertTitle>
              <AlertDescription>Las noticias están apagadas en este despliegue. Un administrador puede volver a encenderlas.</AlertDescription>
            </Alert>
          )}
          {problems.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {problems.map((feed) => (
                <li key={feed.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={feed.status === "error" ? "warning-light" : "outline"}>{feed.status === "error" ? "Con problemas" : "Apagada"}</Badge>
                  <span>
                    {feed.status === "error" ? `No pudimos leer: ${feed.outlet}.` : `Fuente desactivada: ${feed.outlet}.`}
                    {feed.status === "error" && feed.message ? ` ${feed.message}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
      asideLabel="Resumen de noticias"
      aside={
        view.status === "ready" &&
        !data?.off && (
          <FeedSummary
            total={news.relevantItems.length}
            totalLabel={news.relevantItems.length === 1 ? "noticia relevante" : "noticias relevantes"}
            groups={[{ title: "Por tema", selected: values.group, onSelect: changed("group"), options: groupCounts }]}
            facts={[{ label: "Titulares leídos", value: news.items.length }]}
          />
        )
      }
    >
      {view.status === "pending" ? (
        <EventListSkeleton label="Consultando los medios" />
      ) : view.status === "ready" && !data?.off ? (
        filtered.length === 0 ? (
          <RegionEmpty
            title="No hay titulares para mostrar"
            description={news.items.length === 0 ? "Los medios no devolvieron titulares ahora mismo." : "Ninguna noticia cumple los filtros. Quite un filtro o elija «Todas las noticias»."}
            action={active || dates ? { label: "Limpiar filtros", onClick: clear } : undefined}
          />
        ) : (
          <>
            <EventList
              flat
              label="Noticias"
              items={shown.map((item) => ({ item, at: item.publishedAt }))}
              getKey={({ item }) => item.id}
              renderItem={({ item }) => (
                <EventItem
                  title={item.title}
                  at={item.publishedAt}
                  source={item.outlet}
                  topic={[...new Set(item.matchedTerms)].slice(0, 3).join(", ") || undefined}
                  badge={item.via === "google-news" ? { label: "Vía Google News", tone: "neutral" } : undefined}
                  href={item.url}
                />
              )}
            />
            {shown.length < filtered.length && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
                  Ver más ({filtered.length - shown.length})
                </Button>
              </div>
            )}
            <div className="px-3 py-2">
              <ProvenanceNote
                attribution="RSS de medios colombianos y Google News"
                license="Solo titular, medio, fecha y enlace (derechos del medio)"
                fetchedAt={view.updatedAt}
                extra="últimos 12 meses"
              />
            </div>
          </>
        )
      ) : null}
    </FeedLayout>
  );
}
