"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { SAMPLE_TRM } from "./sample-data";

const CONFIG: ChartConfig = { valor: { label: "TRM (ejemplo)", color: "var(--info)" } };

/** The app's chart container with sample data. No tooltip and no animation: it is only a preview. */
export default function MockChart() {
  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-full min-h-48 w-full min-w-0">
      <AreaChart data={SAMPLE_TRM} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="landing-trm-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="fecha" hide />
        <YAxis domain={["auto", "auto"]} width={44} tickLine={false} axisLine={false} />
        <Area dataKey="valor" type="monotone" stroke="var(--color-valor)" strokeWidth={1.5} fill="url(#landing-trm-fill)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
