"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatFecha } from "@/lib/date";
import { formatCop, formatCopCompacto } from "@/lib/money";
import type { PuntoTrm } from "./types";

type Modo = "nivel" | "variacion";

const CONFIG: ChartConfig = {
  valor: { label: "TRM", color: "var(--info)" },
  variacionPct: { label: "Variación" },
};

const LEYENDA: Record<Modo, { label: string; className: string }[]> = {
  nivel: [{ label: "TRM en pesos por dólar", className: "bg-info" }],
  variacion: [
    { label: "Sube", className: "bg-info" },
    { label: "Baja", className: "bg-destructive" },
  ],
};

const AXIS = { tickLine: false, axisLine: false } as const;

export function TrmChart({ datos }: { datos: PuntoTrm[] }) {
  const [modo, setModo] = useState<Modo>("nivel");
  const primero = datos[0];
  const ultimo = datos[datos.length - 1];

  return (
    <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-2 [.border-b]:pb-2">
        <div className="flex min-w-0 flex-col gap-px">
          <CardTitle className="text-sm leading-5 font-semibold">Histórico de la TRM</CardTitle>
          <CardDescription>
            {primero && ultimo ? `${formatFecha(primero.fecha)} a ${formatFecha(ultimo.fecha)}` : "Sin datos"}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {LEYENDA[modo].map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 rounded-full ${item.className}`} />
                {item.label}
              </li>
            ))}
          </ul>

          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Serie mostrada"
            value={[modo]}
            onValueChange={(valor) => {
              const siguiente = valor[0] as Modo | undefined;
              if (siguiente) setModo(siguiente);
            }}
          >
            <ToggleGroupItem value="nivel">Nivel</ToggleGroupItem>
            <ToggleGroupItem value="variacion">Variación</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent className="flex-1 py-4">
        <ChartContainer config={CONFIG} className="aspect-auto h-full min-h-56 w-full min-w-0">
          {modo === "nivel" ? (
            <AreaChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trm-nivel-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={(valor: string) => formatFecha(valor)}
                minTickGap={48}
                {...AXIS}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={52}
                tickFormatter={(valor: number) => formatCopCompacto(valor)}
                {...AXIS}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(valor) => formatFecha(String(valor))}
                    formatter={(valor) => [formatCop(Number(valor ?? 0)), " TRM"]}
                  />
                }
              />
              <Area
                dataKey="valor"
                type="monotone"
                stroke="var(--color-valor)"
                strokeWidth={1.5}
                fill="url(#trm-nivel-fill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={(valor: string) => formatFecha(valor)}
                minTickGap={48}
                {...AXIS}
              />
              <YAxis width={44} tickFormatter={(valor: number) => `${valor}%`} {...AXIS} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(valor) => formatFecha(String(valor))}
                    formatter={(valor) => [`${Number(valor ?? 0).toFixed(2)}%`, " Variación"]}
                  />
                }
              />
              <Bar dataKey="variacionPct" radius={2} isAnimationActive={false}>
                {datos.map((punto) => (
                  <Cell key={punto.fecha} fill={(punto.variacionPct ?? 0) >= 0 ? "var(--info)" : "var(--destructive)"} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
