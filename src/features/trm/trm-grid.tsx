"use client";

import { type ColumnDef, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { DownloadIcon, StarIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/reui/badge";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { exportarCsv } from "@/lib/csv";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Delta } from "./delta";
import type { PuntoTrm } from "./types";
import { useTrmThreshold } from "./use-trm";

interface Props {
  title: string;
  icon: ReactNode;
  datos: PuntoTrm[];
  estaGuardado: (fecha: string) => boolean;
  onAlternarAlerta: (fecha: string) => void;
  /** Hides the "only atypical days" filter, e.g. when the rows are already a curated subset. */
  ocultarFiltro?: boolean;
}

export function TrmGrid({ title, icon, datos, estaGuardado, onAlternarAlerta, ocultarFiltro = false }: Props) {
  const umbral = useTrmThreshold();
  const [soloAtipicos, setSoloAtipicos] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "fecha", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const filas = useMemo(() => (soloAtipicos ? datos.filter((punto) => punto.atipico) : datos), [datos, soloAtipicos]);

  const columns = useMemo<ColumnDef<DataGridFeatures, PuntoTrm>[]>(
    () => [
      {
        accessorKey: "fecha",
        id: "fecha",
        header: ({ column }) => <DataGridColumnHeader title="Fecha" column={column} />,
        cell: ({ row }) => <span className="font-medium whitespace-nowrap">{formatFecha(row.original.fecha)}</span>,
        size: 160,
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "valor",
        id: "valor",
        header: ({ column }) => <DataGridColumnHeader title="TRM" column={column} />,
        cell: ({ row }) => <span className="tabular-nums">{formatCop(row.original.valor)}</span>,
        size: 160,
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "variacionPct",
        id: "variacionPct",
        header: ({ column }) => <DataGridColumnHeader title="Variación vs. día anterior" column={column} />,
        cell: ({ row }) => <Delta value={row.original.variacionPct} against="frente al día anterior" />,
        size: 220,
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "atipico",
        id: "atipico",
        header: ({ column }) => <DataGridColumnHeader title="Señal" column={column} />,
        cell: ({ row }) =>
          row.original.atipico ? (
            <Badge variant="warning-light" size="sm">
              Variación atípica
            </Badge>
          ) : (
            <span className="text-muted-foreground">Normal</span>
          ),
        size: 160,
        enableSorting: true,
        enableHiding: false,
      },
      {
        id: "alerta",
        header: () => <span className="sr-only">Alerta</span>,
        cell: ({ row }) => {
          const fecha = row.original.fecha;
          const guardada = estaGuardado(fecha);

          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={guardada}
                aria-label={`${guardada ? "Quitar de" : "Guardar en"} alertas el ${formatFecha(fecha)}`}
                onClick={() => onAlternarAlerta(fecha)}
              >
                <StarIcon aria-hidden="true" className={cn(guardada && "fill-current text-warning")} />
              </Button>
            </div>
          );
        },
        size: 72,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [estaGuardado, onAlternarAlerta],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filas,
    pageCount: Math.ceil(filas.length / pagination.pageSize),
    getRowId: (row: PuntoTrm) => row.fecha,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <Card className="min-w-0 gap-0 py-0">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:min-h-14 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground [&_svg:not([class*=size-])]:size-4">
          {icon}
          <h2 className="truncate text-sm font-medium text-foreground">{title}</h2>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:ml-auto lg:flex-nowrap">
          {!ocultarFiltro && (
            <Label className="gap-2 text-sm font-normal">
              <Checkbox
                checked={soloAtipicos}
                onCheckedChange={(marcado) => {
                  setSoloAtipicos(marcado === true);
                  setPagination((actual) => ({ ...actual, pageIndex: 0 }));
                }}
              />
              Solo variaciones de {umbral}% o más
            </Label>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={filas.length === 0}
            onClick={() => exportarCsv(filas, "trm-smurfit-westrock.csv")}
          >
            <DownloadIcon aria-hidden="true" data-icon="inline-start" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <DataGrid
        table={table}
        recordCount={filas.length}
        emptyMessage="Ningún día coincide con este filtro."
        tableLayout={{ headerBackground: false }}
      >
        <DataGridContainer>
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        <div className="border-t px-4 py-3">
          <DataGridPagination
            sizes={[10, 25, 50]}
            rowsPerPageLabel="Filas por página"
            info="{from} - {to} de {count} días"
            previousPageLabel="Ir a la página anterior"
            nextPageLabel="Ir a la página siguiente"
          />
        </div>
      </DataGrid>
    </Card>
  );
}
