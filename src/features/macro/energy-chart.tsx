"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ChartPanel } from "@/components/layouts/chart-panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Observation } from "@/core/domain/observation";
import { SOURCES } from "@/features/entorno/sources";
import { formatFecha } from "@/lib/date";

const CONFIG = { value: { label: "Precio de bolsa", color: "var(--warning)" } } satisfies ChartConfig;
const AXIS = { tickLine: false, axisLine: false } as const;
const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

interface Props {
  observations: readonly Observation[];
  /** ISO instant or epoch milliseconds of the last successful read. */
  fetchedAt?: string | number;
}

/** Daily mean national spot price of electricity (XM). Electricity, not gas. */
export function EnergyChart({ observations, fetchedAt }: Props) {
  const data = observations.map((item) => ({ date: item.date, value: Math.round(item.value) }));
  const first = data[0];
  const last = data.at(-1);

  return (
    <ChartPanel
      title="Precio de bolsa de energía (XM)"
      description={`Electricidad, no gas. Promedio diario del precio de bolsa nacional, en COP/kWh${first && last ? `, del ${formatFecha(first.date)} al ${formatFecha(last.date)}.` : "."}`}
    >
        <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full min-w-0">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} minTickGap={32} {...AXIS} />
            <YAxis width={44} tickFormatter={(value: number) => number.format(value)} {...AXIS} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatFecha(String(value))}
                  formatter={(value) => [`${number.format(Number(value ?? 0))} COP/kWh`, " Precio de bolsa"]}
                />
              }
            />
            <Area dataKey="value" type="monotone" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
        <ProvenanceNote attribution={SOURCES.xm.attribution} license={SOURCES.xm.license} fetchedAt={fetchedAt} />
    </ChartPanel>
  );
}
