"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, EyeIcon } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataTableCard } from "@/components/shell/data-table-card";
import { Button } from "@/components/ui/button";
import type { Alert } from "@/core/domain/alert";
import type { Signal } from "@/core/domain/signal";
import { AlertStateBadge, DimensionBadge, SeverityBadge } from "@/features/senales/badges";
import { reviewSignal } from "@/features/senales/alert-actions";
import { formatDiaBogota } from "@/lib/date";

export interface AlertRow {
  signal: Signal;
  alert: Alert;
}

interface Props {
  title: string;
  icon: ReactNode;
  description?: ReactNode;
  rows: AlertRow[];
  onOpen: (signal: Signal) => void;
  actions?: ReactNode;
  toolbar?: ReactNode;
  emptyMessage: ReactNode;
  footer?: ReactNode;
  showNote?: boolean;
}

const SEVERITY_RANK = { info: 0, watch: 1, alert: 2 } as const;
const STATE_ORDER = { new: 0, reviewed: 1, dismissed: 2 } as const;

/** Alerts as a ReUI data grid: severity, state, note, and the review / dismiss actions. */
export function AlertsGrid({
  title,
  icon,
  description,
  rows,
  onOpen,
  actions,
  toolbar,
  emptyMessage,
  footer,
  showNote = false,
}: Props) {
  const columns = useMemo<ColumnDef<DataGridFeatures, AlertRow>[]>(
    () => [
      {
        id: "severity",
        accessorFn: (row) => SEVERITY_RANK[row.signal.severity],
        header: ({ column }) => <DataGridColumnHeader title="Severidad" column={column} />,
        cell: ({ row }) => <SeverityBadge severity={row.original.signal.severity} />,
        size: 120,
        enableHiding: false,
      },
      {
        id: "title",
        accessorFn: (row) => row.signal.title,
        header: ({ column }) => <DataGridColumnHeader title="Alerta" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-1 py-1">
            <span className="font-medium whitespace-normal">{row.original.signal.title}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <DimensionBadge dimension={row.original.signal.dimension} />
              {showNote && row.original.alert.note && (
                <span className="text-xs whitespace-normal text-muted-foreground">Nota: {row.original.alert.note}</span>
              )}
            </span>
          </div>
        ),
        size: 360,
        enableHiding: false,
      },
      {
        id: "date",
        accessorFn: (row) => Date.parse(row.signal.occurredAt),
        header: ({ column }) => <DataGridColumnHeader title="Fecha" column={column} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatDiaBogota(row.original.signal.occurredAt)}</span>
        ),
        size: 130,
        enableHiding: false,
      },
      {
        id: "state",
        accessorFn: (row) => STATE_ORDER[row.alert.state],
        header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
        cell: ({ row }) => <AlertStateBadge state={row.original.alert.state} />,
        size: 120,
        enableHiding: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const { signal, alert } = row.original;
          return (
            <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
              {alert.state === "new" && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Marcar como revisada: ${signal.title}`}
                  onClick={() => reviewSignal(signal)}
                >
                  <CheckIcon aria-hidden="true" data-icon="inline-start" />
                  Revisar
                </Button>
              )}
              <Button variant="ghost" size="sm" aria-label={`Ver detalle: ${signal.title}`} onClick={() => onOpen(signal)}>
                <EyeIcon aria-hidden="true" data-icon="inline-start" />
                {alert.state === "dismissed" ? "Ver" : "Detalle"}
              </Button>
            </div>
          );
        },
        size: 220,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [onOpen, showNote],
  );

  return (
    <DataTableCard
      title={title}
      icon={icon}
      description={description}
      rows={rows}
      columns={columns}
      getRowId={(row) => row.alert.signalId}
      initialSort={[{ id: "date", desc: true }]}
      actions={actions}
      toolbar={toolbar}
      countLabel="alertas"
      emptyMessage={emptyMessage}
      onRowClick={(row) => onOpen(row.signal)}
      footer={footer}
    />
  );
}
