"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PuntoTrm } from "./types";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";

const columnHelper = createColumnHelper<PuntoTrm>();

interface ColumnasOpts {
  estaGuardado: (fecha: string) => boolean;
  onAlternarAlerta: (fecha: string) => void;
}

export function construirColumnas({ estaGuardado, onAlternarAlerta }: ColumnasOpts) {
  return [
    columnHelper.accessor("fecha", {
      header: "Fecha",
      cell: ({ getValue }) => <span className="whitespace-nowrap">{formatFecha(getValue())}</span>,
    }),
    columnHelper.accessor("valor", {
      header: "TRM",
      cell: ({ getValue }) => <span className="font-medium">{formatCop(getValue())}</span>,
    }),
    columnHelper.accessor("variacionPct", {
      header: "Variación vs. día anterior",
      cell: ({ getValue }) => {
        const valor = getValue();
        if (valor === null) return <span className="text-muted-foreground">—</span>;
        const sube = valor > 0;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              sube ? "text-chart-1" : valor < 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {sube ? <ArrowUpIcon className="size-3" /> : valor < 0 ? <ArrowDownIcon className="size-3" /> : null}
            {valor.toFixed(2)}%
          </span>
        );
      },
    }),
    columnHelper.accessor("atipico", {
      header: "Señal",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="outline" className="border-warning text-warning">
            Variación atípica
          </Badge>
        ) : null,
    }),
    columnHelper.display({
      id: "alerta",
      header: "Alerta",
      size: 70,
      cell: ({ row }) => {
        const fecha = row.original.fecha;
        const guardado = estaGuardado(fecha);
        return (
          <Button
            type="button"
            variant={guardado ? "default" : "outline"}
            size="sm"
            onClick={() => onAlternarAlerta(fecha)}
            aria-pressed={guardado}
          >
            <StarIcon className={cn("size-3.5", guardado && "fill-current")} />
            {guardado ? "Guardada" : "Guardar"}
          </Button>
        );
      },
    }),
  ];
}
