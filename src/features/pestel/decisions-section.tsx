"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DownloadIcon, EyeIcon, FileTextIcon, GavelIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/reui/badge";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataTableCard } from "@/components/shell/data-table-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { Decision, DecisionStatus } from "@/core/domain/decision";
import { DECISION_STATUS_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { downloadCsv, downloadText } from "@/lib/download";
import { decisionsToCsv, decisionsToMarkdown } from "./decisions-export";

const STATUS_VARIANT = {
  open: "primary-light",
  evaluating: "warning-light",
  decided: "success-light",
  discarded: "invert-light",
} as const;

const STATUS_ORDER: Record<DecisionStatus, number> = { open: 0, evaluating: 1, decided: 2, discarded: 3 };

interface Props {
  decisions: Decision[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

/** The user's decisions as a ReUI data grid, with create and CSV / Markdown export. */
export function DecisionsSection({ decisions, onOpen, onCreate }: Props) {
  const columns = useMemo<ColumnDef<DataGridFeatures, Decision>[]>(
    () => [
      {
        id: "title",
        accessorFn: (row) => row.title,
        header: ({ column }) => <DataGridColumnHeader title="Decisión" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-1 py-1">
            <span className="font-medium whitespace-normal">{row.original.title}</span>
            <span className="flex flex-wrap gap-1.5">
              {row.original.pestelFactors.map((factor) => (
                <Badge key={factor} variant="outline" size="sm">
                  {PESTEL_LABELS[factor]}
                </Badge>
              ))}
            </span>
          </div>
        ),
        size: 380,
        enableHiding: false,
      },
      {
        id: "status",
        accessorFn: (row) => STATUS_ORDER[row.status],
        header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} size="sm">
            {DECISION_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
        size: 140,
        enableHiding: false,
      },
      {
        id: "reviewAt",
        accessorFn: (row) => row.reviewAt ?? "",
        header: ({ column }) => <DataGridColumnHeader title="Revisar el" column={column} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.reviewAt ?? "Sin fecha"}</span>,
        size: 130,
        enableHiding: false,
      },
      {
        id: "updated",
        accessorFn: (row) => Date.parse(row.updatedAt),
        header: ({ column }) => <DataGridColumnHeader title="Actualizada" column={column} />,
        cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{bogotaDateKey(row.original.updatedAt)}</span>,
        size: 130,
        enableHiding: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" aria-label={`Abrir: ${row.original.title}`} onClick={() => onOpen(row.original.id)}>
              <EyeIcon aria-hidden="true" data-icon="inline-start" />
              Abrir
            </Button>
          </div>
        ),
        size: 110,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [onOpen],
  );

  const stem = () => `decisiones-${bogotaDateKey(new Date())}`;

  return (
    <DataTableCard
      title="Decisiones"
      icon={<GavelIcon aria-hidden="true" />}
      description="Decisiones que estás pensando, con opciones, a favor y en contra. Se guardan solo en este navegador."
      rows={decisions}
      columns={columns}
      getRowId={(row) => row.id}
      initialSort={[{ id: "updated", desc: true }]}
      countLabel="decisiones"
      onRowClick={(row) => onOpen(row.id)}
      actions={
        <>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Nueva decisión
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={decisions.length === 0}
            onClick={() => downloadCsv(`${stem()}.csv`, decisionsToCsv(decisions))}
          >
            <DownloadIcon aria-hidden="true" data-icon="inline-start" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={decisions.length === 0}
            onClick={() => downloadText(`${stem()}.md`, decisionsToMarkdown(decisions), { mime: "text/markdown" })}
          >
            <FileTextIcon aria-hidden="true" data-icon="inline-start" />
            Exportar Markdown
          </Button>
        </>
      }
      emptyMessage={
        <Empty className="border-0 p-6">
          <EmptyHeader>
            <EmptyTitle>Aún no hay decisiones</EmptyTitle>
            <EmptyDescription>
              Crea una desde una plantilla o en blanco. Puedes vincularla a las señales de cada factor.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
