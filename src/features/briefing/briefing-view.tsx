"use client";

import { DownloadIcon, FileTextIcon, PrinterIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { briefingContext } from "@/features/asistente/screen-contexts";
import { useMemo, useState } from "react";
import { DocumentLayout, type DocumentSection } from "@/components/layouts/document-layout";
import { ErrorState } from "@/components/states/error-state";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { briefingToCsv } from "@/core/usecases/briefing-to-csv";
import { briefingToMarkdown } from "@/core/usecases/briefing-to-markdown";
import { buildBriefing } from "@/core/usecases/build-briefing";
import { buildPestel } from "@/core/usecases/build-pestel";
import { getContainer } from "@/features/entorno/container";
import { useSignals } from "@/features/entorno/use-signals";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { DIMENSION_LABELS } from "@/core/labels";
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

  const index: DocumentSection[] = briefing
    ? [
        ...briefing.sections.map((section) => ({ id: `briefing-${section.dimension}`, label: DIMENSION_LABELS[section.dimension] })),
        ...(extras ? [{ id: "lectura-pestel", label: "Lectura PESTEL" }] : []),
        ...(briefing.alerts.length > 0 ? [{ id: "estado-avisos", label: "Estado de los avisos" }] : []),
      ]
    : [];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex min-w-0 shrink-0 flex-col gap-2 print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
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
          </div>
        </div>
        {mode === "custom" && !range && <p className="text-xs text-muted-foreground">Elija las fechas. Mientras tanto se usa la semana anterior.</p>}
        <SourceNotices sources={[{ name: "la TRM", ...data.trm }, { name: "SECOP II", ...data.secop }]} />
      </div>

      {!result.ok && <ErrorState source="el período" message={result.error.message} />}

      <DocumentLayout index={index}>
        {data.isPending || !data.hasHydrated ? (
          <EventListSkeleton label="Preparando el briefing" rows={6} />
        ) : briefing ? (
          <>
            {!hasContent && (
              <RegionEmpty title="No hay avisos en este período" description="Pruebe con otro rango o revise si alguna fuente falló. El archivo se puede descargar igual." />
            )}
            <BriefingDocument briefing={briefing} extras={extras} />
          </>
        ) : null}
      </DocumentLayout>
    </div>
  );
}
