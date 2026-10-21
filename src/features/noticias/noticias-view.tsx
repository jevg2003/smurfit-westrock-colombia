"use client";

import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { createFilterQuery, flattenFilterConditions } from "@/components/reui/filters/filters-query";
import type { FilterField, FilterQuery } from "@/components/reui/filters/filters-types";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsItem } from "@/core/domain/news";
import { bogotaDateKey } from "@/core/time/bogota";
import { useNews } from "@/features/entorno/use-news";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { SelectFilters } from "@/features/filtros/select-filters";
import { formatDiaBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";

const PAGE_SIZE = 30;
const EXCLUDING = new Set(["is_not", "is_none_of"]);

/** Headlines are matched against the term groups of Preferencias; here they can be narrowed further. */
function applyNewsFilters(items: readonly NewsItem[], query: FilterQuery): NewsItem[] {
  const conditions = flattenFilterConditions(query);
  if (conditions.length === 0) return [...items];
  return items.filter((item) =>
    conditions.every((condition) => {
      const values = condition.values.map(String);
      let found: boolean;
      if (condition.field === "outlet") found = values.includes(item.outlet);
      else if (condition.field === "group") found = item.matches.some((match) => values.includes(match.groupId));
      else return true;
      return (EXCLUDING.has(condition.operator) ? !found : found) !== condition.negated;
    }),
  );
}

/** Headlines from Colombian media and Google News: title, outlet, date, link and the terms they mention. */
export function NoticiasView() {
  const news = useNews();
  const onlyTermsId = useId();
  const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery());
  const [dates, setDates] = useState<DayRange | undefined>();
  const [onlyTerms, setOnlyTerms] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const range = dates;

  const fields = useMemo<FilterField[]>(
    () => [
      {
        id: "outlet",
        label: "Medio",
        type: "select",
        options: [...new Set(news.items.map((item) => item.outlet))].sort().map((outlet) => ({ value: outlet, label: outlet })),
      },
      { id: "group", label: "Grupo de términos", type: "select", options: news.groups.map((group) => ({ value: group.id, label: group.label })) },
    ],
    [news.items, news.groups],
  );

  const filtered = useMemo(() => {
    let result = applyNewsFilters(news.items, query);
    if (onlyTerms) result = result.filter((item) => item.matches.length > 0);
    if (!range) return result;
    return result.filter((item) => {
      const day = bogotaDateKey(item.publishedAt);
      return day >= range.fromDate && day <= range.toDate;
    });
  }, [news.items, query, onlyTerms, range]);

  const { view, data } = news;
  const problems = (data?.feeds ?? []).filter((feed) => feed.status !== "ok");
  const shown = filtered.slice(0, visible);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Noticias"
        description="Titulares de medios colombianos y de Google News que mencionan la empresa, los competidores, el sector, la regulación o riesgos operativos. Solo se muestra el titular, el medio, la fecha y el enlace."
      />

      <div className="flex flex-col gap-2">
        {view.status === "error" && <ErrorState source="Noticias" message={view.errorMessage ?? "Error desconocido."} onRetry={view.retry} />}
        {view.isStale && <StaleNotice source="Noticias" updatedAt={view.updatedAt} />}
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
                <Badge variant={feed.status === "error" ? "warning-light" : "outline"} size="sm">
                  {feed.status === "error" ? "Con problemas" : "Apagada"}
                </Badge>
                <span>
                  {feed.status === "error" ? `No pudimos leer: ${feed.outlet}.` : `Fuente desactivada: ${feed.outlet}.`}
                  {feed.status === "error" && feed.message ? ` ${feed.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {view.status === "pending" ? (
        <Skeleton role="status" aria-label="Consultando los medios" className="h-80 rounded-xl" />
      ) : view.status === "ready" && !data?.off ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SelectFilters fields={fields} query={query} onQueryChange={(next) => (setQuery(next), setVisible(PAGE_SIZE))} />
              <DateRangeFilter value={dates} onChange={setDates} label="Fecha" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox id={onlyTermsId} checked={onlyTerms} onCheckedChange={(checked) => (setOnlyTerms(checked === true), setVisible(PAGE_SIZE))} />
              <Label htmlFor={onlyTermsId}>Solo titulares con mis términos</Label>
              <span className="text-xs text-muted-foreground">Los términos se cambian en Preferencias.</span>
            </div>

            {filtered.length === 0 ? (
              <Empty className="border-0 p-6">
                <EmptyHeader>
                  <EmptyTitle>No hay titulares para mostrar</EmptyTitle>
                  <EmptyDescription>
                    {news.items.length === 0
                      ? "Los medios no devolvieron titulares ahora mismo."
                      : "Ningún titular cumple los filtros. Prueba quitar un filtro o la casilla de términos."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Mostrando {shown.length} de {filtered.length} titulares.
                </p>
                <ItemGroup className="gap-2">
                  {shown.map((item) => (
                    <NewsRow key={item.id} item={item} />
                  ))}
                </ItemGroup>
                {shown.length < filtered.length && (
                  <Button variant="outline" size="sm" className="self-start" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
                    Ver más
                  </Button>
                )}
              </>
            )}
          </CardContent>
          <CardFooter>
            <ProvenanceNote
              attribution="RSS de medios colombianos y Google News"
              license="Solo titular, medio, fecha y enlace (derechos del medio)"
              fetchedAt={view.updatedAt}
              extra="últimos 12 meses"
            />
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const url = safeHttpUrl(item.url);
  const terms = [...new Set(item.matchedTerms)];
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle className="whitespace-normal">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.title}
              <ExternalLinkIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            </a>
          ) : (
            item.title
          )}
        </ItemTitle>
        <ItemDescription>
          {item.outlet} · {formatDiaBogota(item.publishedAt)}
        </ItemDescription>
        <div className="flex flex-wrap items-center gap-1">
          {item.via === "google-news" && (
            <Badge variant="info-light" size="sm">
              vía Google News
            </Badge>
          )}
          {terms.slice(0, 5).map((term) => (
            <Badge key={term} variant="outline" size="sm">
              {term}
            </Badge>
          ))}
        </div>
      </ItemContent>
    </Item>
  );
}
