"use client";

import { BellRingIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Signal } from "@/core/domain/signal";
import { bogotaDateKey } from "@/core/time/bogota";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { SignalDetailSheet } from "@/features/senales/signal-detail-sheet";
import { downloadCsv } from "@/lib/download";
import { AlertToolbar } from "./alert-toolbar";
import { alertRowsToCsv } from "./alerts-csv";
import { AlertsGrid } from "./alerts-grid";
import { useRowFilters } from "./use-row-filters";

/**
 * Every alert in the browser: new, reviewed and dismissed. TRM days saved before this release are
 * migrated alerts (state reviewed), so they show here with the rest.
 */
export function AlertasView() {
  const { signals, hasHydrated } = useSignals();
  const rows = useAlertRows(signals);
  const filters = useRowFilters(rows, { withState: true });
  const [open, setOpen] = useState<Signal | null>(null);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Alertas"
        description="Tu lista de seguimiento. Cada alerta pasa de nueva a revisada o descartada, y se guarda en este navegador."
      />

      {!hasHydrated ? (
        <Skeleton role="status" aria-label="Cargando tus alertas" className="h-96 rounded-xl" />
      ) : (
        <AlertsGrid
          title="Alertas"
          icon={<BellRingIcon aria-hidden="true" />}
          description="Los días de la TRM que guardaste antes aparecen aquí como revisadas."
          rows={filters.filtered}
          onOpen={setOpen}
          showNote
          toolbar={<AlertToolbar filters={filters} />}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={filters.filtered.length === 0}
              onClick={() => downloadCsv(`alertas-${bogotaDateKey(new Date())}.csv`, alertRowsToCsv(filters.filtered))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>{filters.isFiltering ? "Ninguna alerta cumple estos filtros" : "Todavía no hay alertas"}</EmptyTitle>
                <EmptyDescription>
                  {filters.isFiltering
                    ? "Quita algún filtro para ver más."
                    : "Aparecen cuando una regla detecta algo, o cuando guardas un día desde Días y variaciones."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        />
      )}

      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </div>
  );
}
