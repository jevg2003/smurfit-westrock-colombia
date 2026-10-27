"use client";

import { BellRingIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Signal } from "@/core/domain/signal";
import { PESTEL_ORDER } from "@/core/usecases/build-pestel";
import { bogotaDateKey } from "@/core/time/bogota";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { signalsContext } from "@/features/asistente/screen-contexts";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { SOURCES } from "@/features/entorno/sources";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { useFollowed } from "@/features/seguimiento/use-followed";
import { downloadCsv } from "@/lib/download";
import { AlertToolbar } from "./alert-toolbar";
import { alertRowsToCsv } from "./alerts-csv";
import { AlertsGrid } from "./alerts-grid";
import { SignalDetailSheet } from "./signal-detail-sheet";
import { useRowFilters } from "./use-row-filters";

/**
 * Every aviso the rules produce, as one list. The review state (nuevo, revisado, descartado) is a filter:
 * dismissed avisos stay out until the Estado filter asks for them.
 */
export function AvisosView() {
  const data = useSignals();
  const pestelParam = useSearchParams()?.get("pestel");
  const pestel = PESTEL_ORDER.find((factor) => factor === pestelParam);
  const { onlyFollowed, followed } = useFollowed(data.contracts);
  const alertRows = useAlertRows(data.signals);
  const [open, setOpen] = useState<Signal | null>(null);

  const rows = useMemo(
    () => alertRows.filter((row) => (!pestel || row.signal.pestel === pestel) && followed(row.signal)),
    [alertRows, pestel, followed],
  );
  const filters = useRowFilters(rows, { withState: true });
  const ready = data.hasHydrated && !data.isPending;
  useRegisterPageContext(
    signalsContext("/resumen", "Avisos", filters.filtered.map((row) => row.signal), { filters: { "solo lo que sigo": onlyFollowed ? "sí" : undefined } }),
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        description="Cada aviso sale de una regla escrita. Ábralo para ver la regla, la evidencia y el registro original."
        actions={<FollowedFilterToggle />}
      />

      {pestel && (
        <p className="text-sm">
          Mostrando solo el factor PESTEL <span className="font-medium">{PESTEL_LABELS[pestel]}</span>.{" "}
          <Link href="/resumen?tab=avisos" className="underline underline-offset-4">
            Ver todos los avisos
          </Link>
        </p>
      )}

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

      {!ready ? (
        <Skeleton role="status" aria-label="Consultando los avisos" className="h-96 rounded-xl" />
      ) : (
        <AlertsGrid
          title="Avisos"
          icon={<BellRingIcon aria-hidden="true" />}
          description={
            filters.hiddenDismissed > 0
              ? `Los descartados no se muestran (${filters.hiddenDismissed}). Use el filtro Estado para verlos.`
              : "Ordene por fecha o severidad. Los filtros se combinan."
          }
          rows={filters.filtered}
          onOpen={setOpen}
          showNote
          toolbar={<AlertToolbar filters={filters} />}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={filters.filtered.length === 0}
              onClick={() => downloadCsv(`avisos-${bogotaDateKey(new Date())}.csv`, alertRowsToCsv(filters.filtered))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>No hay avisos para mostrar</EmptyTitle>
                <EmptyDescription>
                  {filters.isFiltering
                    ? "Ningún aviso cumple estos filtros."
                    : onlyFollowed
                      ? "Ningún aviso es de lo que sigue. Desactive «Solo lo que sigo» para ver todos."
                      : "Ninguna regla se activó con los datos de hoy. Puede ajustar las reglas en Configuración."}
                </EmptyDescription>
              </EmptyHeader>
              {filters.isFiltering && (
                <Button variant="outline" size="sm" onClick={filters.clear}>
                  Limpiar filtros
                </Button>
              )}
            </Empty>
          }
          footer={
            <div className="flex flex-col gap-1">
              <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} fetchedAt={data.trm.updatedAt} />
              <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={data.secop.updatedAt} />
            </div>
          }
        />
      )}

      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </div>
  );
}
