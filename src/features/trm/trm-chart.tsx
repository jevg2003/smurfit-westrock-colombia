"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { PuntoTrm } from "./types";
import { formatFecha } from "@/lib/date";
import { formatCop, formatCopCompacto } from "@/lib/money";

interface Props {
  datos: PuntoTrm[];
}

const CONFIG_NIVEL = {
  valor: { label: "TRM", color: "var(--chart-1)" },
} satisfies ChartConfig;

const CONFIG_VARIACION = {
  variacionPct: { label: "Variación" },
} satisfies ChartConfig;

export function TrmChart({ datos }: Props) {
  if (datos.length === 0) return null;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="min-h-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">TRM (tasa representativa del mercado)</CardTitle>
          <CardDescription>Peso colombiano por dólar, dato diario de Banco de la República.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 px-2">
          <ChartContainer config={CONFIG_NIVEL} className="h-full w-full aspect-auto">
            <LineChart data={datos} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={(valor: string) => formatFecha(valor)}
                minTickGap={40}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(valor: number) => formatCopCompacto(valor)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(valor) => formatFecha(String(valor))}
                    formatter={(valor) => [formatCop(Number(valor ?? 0)), " TRM"]}
                  />
                }
              />
              <Line dataKey="valor" type="monotone" stroke="var(--color-valor)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="min-h-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">Variación diaria (%)</CardTitle>
          <CardDescription>Azul sube, rojo baja vs. el día hábil anterior.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 px-2">
          <ChartContainer config={CONFIG_VARIACION} className="h-full w-full aspect-auto">
            <BarChart data={datos} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={(valor: string) => formatFecha(valor)}
                minTickGap={40}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(valor) => formatFecha(String(valor))}
                    formatter={(valor) => [`${Number(valor ?? 0).toFixed(2)}%`, " Variación"]}
                  />
                }
              />
              <Bar dataKey="variacionPct" radius={[2, 2, 2, 2]}>
                {datos.map((punto) => (
                  <Cell
                    key={punto.fecha}
                    fill={(punto.variacionPct ?? 0) >= 0 ? "var(--chart-1)" : "var(--destructive)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
