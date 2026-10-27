"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartPanel } from "@/components/layouts/chart-panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Observation } from "@/core/domain/observation";
import { formatPct } from "./format";

const CONFIG = {
  pib: { label: "PIB real", color: "var(--info)" },
  ipc: { label: "Inflación anual", color: "var(--warning)" },
} satisfies ChartConfig;

const YEARS_SHOWN = 30;
const AXIS = { tickLine: false, axisLine: false } as const;

interface Point {
  year: string;
  pib?: number;
  ipc?: number;
}

/** Joins both annual series by year, oldest first, keeping the last `YEARS_SHOWN` years. */
export function mergeAnnual(gdp: readonly Observation[], cpi: readonly Observation[]): Point[] {
  const byYear = new Map<string, Point>();
  for (const item of gdp) byYear.set(item.date, { ...byYear.get(item.date), year: item.date, pib: item.value });
  for (const item of cpi) byYear.set(item.date, { ...byYear.get(item.date), year: item.date, ipc: item.value });
  return [...byYear.values()].sort((a, b) => a.year.localeCompare(b.year)).slice(-YEARS_SHOWN);
}

/** GDP growth and CPI inflation by year, on one percent axis. */
export function AnnualChart({ gdp, cpi }: { gdp: readonly Observation[]; cpi: readonly Observation[] }) {
  const data = mergeAnnual(gdp, cpi);
  const first = data[0];
  const last = data.at(-1);

  return (
    <ChartPanel
      title="PIB e inflación por año"
      description={first && last ? `De ${first.year} a ${last.year}, en porcentaje.` : "Sin datos"}
      actions={
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-info" />
            Crecimiento del PIB real
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
            Inflación anual
          </li>
        </ul>
      }
    >
        <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full min-w-0">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" minTickGap={32} {...AXIS} />
            <YAxis width={44} tickFormatter={(value: number) => `${value}%`} {...AXIS} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [formatPct(Number(value ?? 0)), ` ${CONFIG[name as keyof typeof CONFIG]?.label ?? name}`]}
                />
              }
            />
            <Line dataKey="pib" type="monotone" stroke="var(--color-pib)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="ipc" type="monotone" stroke="var(--color-ipc)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ChartContainer>
    </ChartPanel>
  );
}
