"use client";

import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/reui/badge";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import type { RegulationEntry, RegulationItem } from "@/core/domain/regulation";
import { useCuratedNorms, useRegulation } from "@/features/entorno/use-regulation";
import type { RegulationBlock } from "@/infrastructure/sources/regulation/client-adapter";
import { formatDiaBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";

const linkClass =
  "inline-flex items-start gap-1 underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Norms that affect packaging: hand-picked ones, Minambiente publications and Presidencia decrees. */
export function RegulacionView() {
  const norms = useCuratedNorms();
  const regulation = useRegulation();
  const { view, data } = regulation;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Regulación"
        description="Normas que pueden afectar a los empaques y por qué importan, más lo último de Minambiente y los decretos de Presidencia sobre residuos, empaques y sostenibilidad."
      />

      {view.status === "error" && <ErrorState source="Regulación" message={view.errorMessage ?? "Error desconocido."} kind={view.errorKind} onRetry={view.retry} />}
      {view.isStale && <StaleNotice source="Regulación" updatedAt={view.updatedAt} />}

      <CuratedSection norms={norms} />

      <FeedSection
        title="Minambiente"
        sourceName="Minambiente"
        description="Últimas publicaciones del Ministerio de Ambiente. Solo se muestra el título, la fecha y el enlace."
        pending={view.status === "pending"}
        loadingLabel="Consultando Minambiente y Presidencia"
        block={data?.minambiente}
        emptyTitle="Minambiente no tiene publicaciones recientes"
        emptyHelp="El feed del Ministerio no trajo publicaciones de los últimos 12 meses."
        onRetry={view.retry}
        footer={
          data && (
            <ProvenanceNote
              attribution="Ministerio de Ambiente y Desarrollo Sostenible"
              license="Solo titular, fecha y enlace (derechos del Ministerio)"
              fetchedAt={view.updatedAt}
            />
          )
        }
      />

      <FeedSection
        title="Decretos de Presidencia"
        sourceName="Presidencia"
        description="Decretos de los últimos 12 meses que mencionan residuos, empaques, reciclaje, sostenibilidad, energía u otros temas del sector."
        pending={view.status === "pending"}
        loadingLabel="Consultando Minambiente y Presidencia"
        block={data?.presidencia}
        emptyTitle="No hay decretos recientes sobre estos temas"
        emptyHelp="Ningún decreto reciente mencionó las palabras clave de regulación y sostenibilidad."
        onRetry={view.retry}
        footer={
          data && (
            <ProvenanceNote
              attribution="Departamento Administrativo de la Presidencia de la República (DAPRE) vía datos.gov.co"
              license="CC BY-SA 4.0"
              fetchedAt={view.updatedAt}
            />
          )
        }
      />
    </div>
  );
}

function CuratedSection({ norms }: { norms: RegulationEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Normas curadas</CardTitle>
        <CardDescription>Las eligió una persona del equipo. Revisa que sigan vigentes antes de decidir con ellas.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-2">
          {norms.map((norm) => (
            <CuratedRow key={norm.id} norm={norm} />
          ))}
        </ItemGroup>
      </CardContent>
      <CardFooter>
        <ProvenanceNote attribution="Curado manualmente por el equipo del prototipo" license="Resumen propio; el texto de cada norma es público" />
      </CardFooter>
    </Card>
  );
}

function CuratedRow({ norm }: { norm: RegulationEntry }) {
  const url = norm.url ? safeHttpUrl(norm.url) : undefined;
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle className="flex-wrap whitespace-normal">
          {norm.name}
          <Badge variant="info-light" size="sm">
            Curado manualmente
          </Badge>
        </ItemTitle>
        <ItemDescription>
          {norm.topic} · Fecha de la norma: {formatDiaBogota(`${norm.date}T12:00:00.000Z`)} · Revisada el {formatDiaBogota(`${norm.reviewedAt}T12:00:00.000Z`)}
        </ItemDescription>
        <p className="text-sm">{norm.whyItMatters}</p>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ver la norma: ${norm.name}`} className={`${linkClass} w-fit text-sm`}>
            Ver la norma{norm.urlLabel ? ` (${norm.urlLabel})` : ""}
            <ExternalLinkIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Sin enlace oficial verificado todavía.</span>
        )}
      </ItemContent>
    </Item>
  );
}

interface FeedSectionProps {
  title: string;
  sourceName: string;
  description: string;
  pending: boolean;
  loadingLabel: string;
  block: RegulationBlock | undefined;
  emptyTitle: string;
  emptyHelp: string;
  onRetry: () => void;
  footer: ReactNode;
}

function FeedSection({ title, sourceName, description, pending, loadingLabel, block, emptyTitle, emptyHelp, onRetry, footer }: FeedSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {pending ? (
          <Skeleton role="status" aria-label={loadingLabel} className="h-32 rounded-lg" />
        ) : !block ? null : block.status === "disabled" ? (
          <Alert>
            <InfoIcon />
            <AlertTitle>Fuente desactivada: {sourceName}</AlertTitle>
            <AlertDescription>Esta fuente está apagada en este despliegue. Un administrador puede volver a encenderla.</AlertDescription>
          </Alert>
        ) : block.status === "error" ? (
          <ErrorState source={sourceName} message={block.message ?? "La fuente no respondió."} onRetry={onRetry} />
        ) : block.items.length === 0 ? (
          <Empty className="border-0 p-6">
            <EmptyHeader>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyHelp}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-2">
            {block.items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {block?.status === "ok" && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

function FeedRow({ item }: { item: RegulationItem }) {
  const url = safeHttpUrl(item.url);
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle className="whitespace-normal">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {item.title}
              <ExternalLinkIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            </a>
          ) : (
            item.title
          )}
        </ItemTitle>
        <ItemDescription>{formatDiaBogota(item.publishedAt)}</ItemDescription>
        {item.summary && <p className="text-sm">{item.summary}</p>}
      </ItemContent>
    </Item>
  );
}
