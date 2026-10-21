"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { contractsContext } from "@/features/asistente/screen-contexts";
import { DownloadIcon, ExternalLinkIcon, LandmarkIcon } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/reui/badge";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataTableCard } from "@/components/shell/data-table-card";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPANY } from "@/content/config/empresa";
import type { PublicContract } from "@/core/domain/contract";
import { bogotaDateKey } from "@/core/time/bogota";
import { getContainer } from "@/features/entorno/container";
import { SOURCES } from "@/features/entorno/sources";
import { useSecop } from "@/features/entorno/use-secop";
import { formatDiaBogota } from "@/lib/date";
import { downloadCsv } from "@/lib/download";
import { formatCop } from "@/lib/money";
import { safeHttpUrl } from "@/lib/safe-url";
import { usePreferencesStore } from "@/stores/preferences.store";
import { contractsToCsv } from "./contracts-csv";
import { contractExpiry, type ExpiryLevel } from "@/core/rules/contract-expiry";

const BADGE: Record<ExpiryLevel, "destructive-light" | "warning-light" | "success-light" | "outline"> = {
  alert: "destructive-light",
  watch: "warning-light",
  ok: "success-light",
  neutral: "outline",
};

/** Public contracts (SECOP II) of the company NIT, with the expiry window of each. */
export function ContratacionView() {
  const { view, data } = useSecop();
  const thresholds = usePreferencesStore((state) => state.thresholds);
  const expiry = useMemo(
    () => ({ watchDays: thresholds.contractExpiryWatchDays, alertDays: thresholds.contractExpiryAlertDays }),
    [thresholds],
  );
  const now = getContainer().clock.now();

  const rows = useMemo(
    () => (data?.contracts ?? []).filter((contract) => contract.supplierNit === COMPANY.nit),
    [data],
  );
  useRegisterPageContext(contractsContext("/contratacion", "Contratación", rows));

  const columns = useMemo<ColumnDef<DataGridFeatures, PublicContract>[]>(
    () => [
      {
        id: "entity",
        accessorFn: (row) => row.entity,
        header: ({ column }) => <DataGridColumnHeader title="Entidad" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col py-1">
            <span className="font-medium whitespace-normal">{row.original.entity}</span>
            <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
          </div>
        ),
        size: 300,
        enableHiding: false,
      },
      {
        id: "value",
        accessorFn: (row) => row.value,
        header: ({ column }) => <DataGridColumnHeader title="Valor" column={column} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatCop(row.original.value)}</span>,
        size: 150,
        enableHiding: false,
      },
      {
        id: "signedAt",
        accessorFn: (row) => Date.parse(row.signedAt),
        header: ({ column }) => <DataGridColumnHeader title="Firma" column={column} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDiaBogota(row.original.signedAt)}</span>,
        size: 130,
        enableHiding: false,
      },
      {
        id: "endsAt",
        accessorFn: (row) => (row.endsAt ? Date.parse(row.endsAt) : 0),
        header: ({ column }) => <DataGridColumnHeader title="Fin" column={column} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.endsAt ? formatDiaBogota(row.original.endsAt) : "Sin fecha"}
          </span>
        ),
        size: 130,
        enableHiding: false,
      },
      {
        id: "expiry",
        accessorFn: (row) => contractExpiry(row, now, expiry).days ?? Number.MAX_SAFE_INTEGER,
        header: ({ column }) => <DataGridColumnHeader title="Vencimiento" column={column} />,
        cell: ({ row }) => {
          const result = contractExpiry(row.original, now, expiry);
          return (
            <Badge variant={BADGE[result.level]} size="sm">
              {result.label}
            </Badge>
          );
        },
        size: 150,
        enableHiding: false,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.status}</span>,
        size: 130,
        enableHiding: false,
      },
      {
        id: "process",
        header: () => <span className="sr-only">Proceso</span>,
        cell: ({ row }) => {
          const url = safeHttpUrl(row.original.processUrl);
          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir proceso en SECOP: ${row.original.entity}`}
              className="inline-flex items-center gap-1 text-sm whitespace-nowrap underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Abrir proceso
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Sin enlace</span>
          );
        },
        size: 150,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [expiry, now],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Contratación"
        description="Contratos públicos que firmó la empresa en los últimos 12 meses y cuándo vencen. Las ventanas de vencimiento se editan en Preferencias."
      />

      {view.status === "error" && (
        <ErrorState source="SECOP II" message={view.errorMessage ?? "Error desconocido."} kind={view.errorKind} onRetry={view.retry} />
      )}
      {view.isStale && <StaleNotice source="SECOP II" updatedAt={view.updatedAt} />}

      {view.status === "pending" ? (
        <Skeleton role="status" aria-label="Consultando SECOP II en datos.gov.co" className="h-96 rounded-xl" />
      ) : view.status === "ready" ? (
        <DataTableCard
          title={`Contratos de ${COMPANY.name}`}
          icon={<LandmarkIcon aria-hidden="true" />}
          description={`NIT ${COMPANY.nit}. Vigilar desde ${thresholds.contractExpiryWatchDays} días, alerta desde ${thresholds.contractExpiryAlertDays} días antes del fin.`}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          initialSort={[{ id: "signedAt", desc: true }]}
          countLabel="contratos"
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => downloadCsv(`contratos-${bogotaDateKey(now)}.csv`, contractsToCsv(rows, now, expiry))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>No hay contratos en los últimos 12 meses para este NIT</EmptyTitle>
                <EmptyDescription>
                  SECOP II no devolvió contratos firmados por el NIT {COMPANY.nit} desde hace un año.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          footer={
            <ProvenanceNote
              attribution={SOURCES.secop.attribution}
              license={SOURCES.secop.license}
              fetchedAt={view.updatedAt}
            />
          }
        />
      ) : null}
    </div>
  );
}
