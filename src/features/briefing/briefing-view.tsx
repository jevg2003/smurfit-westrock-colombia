"use client";

import { DownloadIcon, FileTextIcon, PrinterIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { briefingContext } from "@/features/asistente/screen-contexts";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { briefingToCsv } from "@/core/usecases/briefing-to-csv";
import { briefingToMarkdown } from "@/core/usecases/briefing-to-markdown";
import { buildBriefing } from "@/core/usecases/build-briefing";
import { buildPestel } from "@/core/usecases/build-pestel";
import { getContainer } from "@/features/entorno/container";
import { useSignals } from "@/features/entorno/use-signals";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { bogotaDateKey } from "@/core/time/bogota";
import { downloadCsv, downloadText } from "@/lib/download";
import { useAlertsStore } from "@/stores/alerts.store";
import { useDecisionsStore } from "@/stores/decisions.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { BriefingDocument } from "./briefing-document";

/** Weekly briefing: previous calendar week by default, or a free range. Built from rules, never from AI. */
export function BriefingView() {
  const data = useSignals();
  const alerts = useAlertsStore((state) => state.alerts);
  const mode = usePreferencesStore((state) => state.briefingPeriod);
  const setMode = usePreferencesStore((state) => state.setBriefingPeriod);
  const [dates, setDates] = useState<DayRange | undefined>();
  const range = mode === "custom" ? dates : undefined;

  const result = useMemo(
    () => buildBriefing({ signals: data.signals, alerts, clock: getContainer().clock, custom: range }),
    [data.signals, alerts, range],
  );
  const briefing = result.ok ? result.value : undefined;
  useRegisterPageContext(briefingContext(briefing, mode));
  const decisions = useDecisionsStore((state) => state.decisions);
  const extras = useMemo(
    () =>
      briefing
        ? { pestel: buildPestel(data.signals, { from: briefing.periodFrom, to: briefing.periodTo }), decisions }
        : undefined,
    [briefing, data.signals, decisions],
  );
  const stem = briefing ? `briefing-${bogotaDateKey(briefing.periodFrom)}-${bogotaDateKey(briefing.periodTo)}` : "briefing";
  const hasContent = briefing ? briefing.sections.length > 0 || briefing.alerts.length > 0 : false;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Briefing"
        description="Un resumen del período listo para compartir. Por defecto es la semana anterior, de lunes a domingo (hora de Bogotá)."
        actions={
          <>
            <Button size="sm" disabled={!briefing} onClick={() => window.print()}>
              <PrinterIcon aria-hidden="true" data-icon="inline-start" />
              Imprimir / Guardar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!briefing}
              onClick={() => briefing && downloadText(`${stem}.md`, briefingToMarkdown(briefing, extras), { mime: "text/markdown" })}
            >
              <FileTextIcon aria-hidden="true" data-icon="inline-start" />
              Descargar Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!briefing}
              onClick={() => briefing && downloadCsv(`${stem}.csv`, briefingToCsv(briefing, extras))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Descargar CSV
            </Button>
          </>
        }
      />

      <div className="flex min-w-0 flex-col gap-3 print:hidden">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <ToggleGroup
            value={[mode]}
            variant="outline"
            size="sm"
            aria-label="Período del briefing"
            onValueChange={(next) => {
              const value = next[0];
              if (value === "previous-week" || value === "custom") setMode(value);
            }}
          >
            <ToggleGroupItem value="previous-week">Semana anterior</ToggleGroupItem>
            <ToggleGroupItem value="custom">Rango libre</ToggleGroupItem>
          </ToggleGroup>
          {mode === "custom" && <DateRangeFilter value={dates} onChange={setDates} label="Rango del briefing" />}
        </div>
        {mode === "custom" && !range && (
          <p className="text-xs text-muted-foreground">Elige las fechas. Mientras tanto se usa la semana anterior.</p>
        )}
        {data.trm.status === "error" && (
          <ErrorState source="la TRM" message={data.trm.errorMessage ?? "Error desconocido."} kind={data.trm.errorKind} onRetry={data.trm.retry} />
        )}
        {data.secop.status === "error" && (
          <ErrorState source="SECOP II" message={data.secop.errorMessage ?? "Error desconocido."} kind={data.secop.errorKind} onRetry={data.secop.retry} />
        )}
        {data.trm.isStale && <StaleNotice source="la TRM" updatedAt={data.trm.updatedAt} />}
        {data.secop.isStale && <StaleNotice source="SECOP II" updatedAt={data.secop.updatedAt} />}
      </div>

      {!result.ok && (
        <ErrorState source="el período" message={result.error.message} />
      )}

      {data.isPending || !data.hasHydrated ? (
        <Skeleton role="status" aria-label="Preparando el briefing" className="h-96 rounded-xl" />
      ) : briefing ? (
        <>
          {!hasContent && (
            <Empty className="border border-dashed print:hidden">
              <EmptyHeader>
                <EmptyTitle>No hay señales en este período</EmptyTitle>
                <EmptyDescription>
                  Prueba con otro rango, o revisa si alguna fuente falló. El archivo se puede descargar igual.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <BriefingDocument briefing={briefing} extras={extras} />
        </>
      ) : null}
    </div>
  );
}
