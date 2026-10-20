"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrmPagination } from "./trm-pagination";
import { EmptyState } from "@/components/states/empty-state";
import type { PuntoTrm } from "./types";
import { construirColumnas } from "./columns";

interface Props {
  datos: PuntoTrm[];
  estaGuardado: (fecha: string) => boolean;
  onAlternarAlerta: (fecha: string) => void;
  soloAtipicosInicial?: boolean;
  ocultarFiltro?: boolean;
}

export function TrmTable({
  datos,
  estaGuardado,
  onAlternarAlerta,
  soloAtipicosInicial = false,
  ocultarFiltro = false,
}: Props) {
  const [soloAtipicos, setSoloAtipicos] = useState(soloAtipicosInicial);
  const [sorting, setSorting] = useState<SortingState>([{ id: "fecha", desc: true }]);
  const [paginacion, setPaginacion] = useState({ pageIndex: 0, pageSize: 10 });

  const filtrados = useMemo(
    () => (soloAtipicos ? datos.filter((p) => p.atipico) : datos),
    [datos, soloAtipicos],
  );

  const columnas = useMemo(
    () => construirColumnas({ estaGuardado, onAlternarAlerta }),
    [estaGuardado, onAlternarAlerta],
  );

  const tabla = useReactTable({
    data: filtrados,
    columns: columnas,
    state: { sorting, pagination: paginacion },
    onSortingChange: setSorting,
    onPaginationChange: setPaginacion,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.fecha,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        {!ocultarFiltro && (
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox checked={soloAtipicos} onCheckedChange={(v) => setSoloAtipicos(v === true)} />
            Solo variaciones atípicas (≥1% vs. día anterior)
          </Label>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtrados.length} días</span>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState message="Ningún día coincide con este filtro." />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                {tabla.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {tabla.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="shrink-0">
            <TrmPagination
              paginaActual={paginacion.pageIndex}
              totalPaginas={tabla.getPageCount()}
              onCambiar={(pagina) => setPaginacion((p) => ({ ...p, pageIndex: pagina }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
