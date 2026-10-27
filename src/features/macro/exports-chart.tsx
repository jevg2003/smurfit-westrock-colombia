"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartPanel } from "@/components/layouts/chart-panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Observation } from "@/core/domain/observation";
import { formatMillionsUsd, formatQuarter } from "./format";

const CONFIG = { value: { label: "Exportaciones NME", color: "var(--info)" } } satisfies ChartConfig;
const AXIS = { tickLine: false, axisLine: false } as const;

/** Quarterly national exports. Not a sector cut: the dataset has none. */
export function ExportsChart({ observations }: { observations: readonly Observation[] }) {
  const data = observations.map((item) => ({ date: item.date, value: item.value }));

  return (
    <ChartPanel title="Exportaciones por trimestre" description="Total nacional, sin corte por sector. Cada barra es un trimestre, en millones de USD.">
        <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full min-w-0">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatQuarter} minTickGap={40} {...AXIS} />
            <YAxis width={48} tickFormatter={(value: number) => formatMillionsUsd(value)} {...AXIS} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatQuarter(String(value))}
                  formatter={(value) => [`${formatMillionsUsd(Number(value ?? 0))} millones de USD`, " Exportaciones NME"]}
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={2} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
    </ChartPanel>
  );
}
