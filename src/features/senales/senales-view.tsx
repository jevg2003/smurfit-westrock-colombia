"use client";

import { DownloadIcon, ZapIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Signal } from "@/core/domain/signal";
import { AlertToolbar } from "@/features/alertas/alert-toolbar";
import { alertRowsToCsv } from "@/features/alertas/alerts-csv";
import { AlertsGrid, type AlertRow } from "@/features/alertas/alerts-grid";
import { useRowFilters } from "@/features/alertas/use-row-filters";
import { SOURCES } from "@/features/entorno/sources";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { downloadCsv } from "@/lib/download";
import { bogotaDateKey } from "@/core/time/bogota";
import { SignalDetailSheet } from "./signal-detail-sheet";

/** Every signal the rules produce today, with filters, a detail sheet and CSV export. */
export function SenalesView() {
  const data = useSignals();
  const alertRows = useAlertRows(data.signals);
  const [open, setOpen] = useState<Signal | null>(null);

  const rows = useMemo<AlertRow[]>(() => {
    const live = new Set(data.signals.map((signal) => signal.id));
    return alertRows.filter((row) => live.has(row.signal.id));
  }, [alertRows, data.signals]);

  const filters = useRowFilters(rows, { withState: true });
  const ready = data.hasHydrated && !data.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Señales"
        description="Cada señal sale de una regla escrita. Ábrela para ver la regla, la evidencia y el registro original."
      />

      <div className="flex flex-col gap-2">
        {data.trm.status === "error" && (
          <ErrorState source="la TRM" message={data.trm.errorMessage ?? "Error desconocido."} onRetry={data.trm.retry} />
        )}
        {data.secop.status === "error" && (
          <ErrorState source="SECOP II" message={data.secop.errorMessage ?? "Error desconocido."} onRetry={data.secop.retry} />
        )}
        {data.trm.isStale && <StaleNotice source="la TRM" updatedAt={data.trm.updatedAt} />}
        {data.secop.isStale && <StaleNotice source="SECOP II" updatedAt={data.secop.updatedAt} />}
      </div>

      {!ready ? (
        <Skeleton role="status" aria-label="Consultando las señales" className="h-96 rounded-xl" />
      ) : (
        <AlertsGrid
          title="Todas las señales"
          icon={<ZapIcon aria-hidden="true" />}
          description="Ordena por fecha o severidad. Los filtros se combinan."
          rows={filters.filtered}
          onOpen={setOpen}
          toolbar={<AlertToolbar filters={filters} />}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={filters.filtered.length === 0}
              onClick={() => downloadCsv(`senales-${bogotaDateKey(new Date())}.csv`, alertRowsToCsv(filters.filtered))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>No hay señales para mostrar</EmptyTitle>
                <EmptyDescription>
                  {filters.isFiltering
                    ? "Ninguna señal cumple estos filtros. Quítalos para ver todas."
                    : "Ninguna regla se activó con los datos de hoy. Puedes ajustar los umbrales en Preferencias."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          footer={
            <div className="flex flex-col gap-1">
              <ProvenanceNote
                attribution={SOURCES.trm.attribution}
                license={SOURCES.trm.license}
                fetchedAt={data.trm.updatedAt}
              />
              <ProvenanceNote
                attribution={SOURCES.secop.attribution}
                license={SOURCES.secop.license}
                fetchedAt={data.secop.updatedAt}
              />
            </div>
          }
        />
      )}

      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </div>
  );
}
