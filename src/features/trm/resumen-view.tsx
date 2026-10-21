"use client";

import { CircleDollarSignIcon, StarIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react";
import { useId } from "react";
import { Area, AreaChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/shell/stat-card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertas } from "@/features/alertas/use-alertas";
import { formatFecha } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AtipicosCard } from "./atipicos-card";
import { Delta } from "./delta";
import { usePeriodo } from "./periodo";
import { TrmChart } from "./trm-chart";
import { TrmData } from "./trm-data";
import type { PuntoTrm } from "./types";
import { useTrmThreshold } from "./use-trm";

const CONFIG_SPARK = { valor: { label: "TRM", color: "var(--info)" } } satisfies ChartConfig;
const DIAS_BARRAS = 14;

function Sparkline({ datos }: { datos: PuntoTrm[] }) {
  const gradiente = `spark-${useId().replace(/:/g, "")}`;
  const ultimo = datos[datos.length - 1];

  return (
    <div role="img" aria-label={`TRM de los últimos ${datos.length} días, hoy ${formatCop(ultimo.valor)}`} className="h-14 w-full">
      <ChartContainer config={CONFIG_SPARK} className="aspect-auto h-14 w-full">
        <AreaChart data={datos} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="fecha" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            dataKey="valor"
            type="monotone"
            stroke="var(--color-valor)"
            strokeWidth={1.5}
            fill={`url(#${gradiente})`}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot x={ultimo.fecha} y={ultimo.valor} r={4} fill="var(--color-valor)" stroke="var(--card)" strokeWidth={2} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function BarrasAtipicas({ datos }: { datos: PuntoTrm[] }) {
  const umbral = useTrmThreshold();
  const recientes = datos.slice(-DIAS_BARRAS);
  const tope = Math.max(...recientes.map((punto) => Math.abs(punto.variacionPct ?? 0)), umbral);
  const resumen = recientes
    .map((punto) => (punto.variacionPct === null ? "sin dato" : `${punto.variacionPct.toFixed(2)}%`))
    .join(", ");

  return (
    <div
      role="img"
      aria-label={`Variación diaria absoluta de los últimos ${recientes.length} días: ${resumen}`}
      className="flex h-14 w-full items-end gap-1"
    >
      {recientes.map((punto) => {
        const altura = Math.max(8, (Math.abs(punto.variacionPct ?? 0) / tope) * 100);

        return (
          <span key={punto.fecha} className="relative h-full flex-1">
            <span className="absolute inset-0 rounded-full bg-muted" />
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 rounded-full",
                punto.atipico ? "bg-warning" : "bg-muted-foreground/40",
              )}
              style={{ height: `${altura}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}

function Resumen({ datos }: { datos: PuntoTrm[] }) {
  const umbral = useTrmThreshold();
  const { ids, estaGuardado, alternar } = useAlertas();
  const ultimo = datos[datos.length - 1];
  const anterior = datos[datos.length - 2];

  if (!ultimo) return null;

  const maximo = datos.reduce((mayor, punto) => (punto.valor > mayor.valor ? punto : mayor), ultimo);
  const atipicos = datos.filter((punto) => punto.atipico).length;

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
        <StatCard
          icon={CircleDollarSignIcon}
          label="TRM hoy"
          meta={formatFecha(ultimo.fecha)}
          value={formatCop(ultimo.valor)}
          delta={<Delta value={ultimo.variacionPct} against="frente al día anterior" />}
          hint={anterior ? `Día anterior: ${formatCop(anterior.valor)}` : undefined}
          action={{ label: "Ver días y variaciones", href: "/dias" }}
        >
          <Sparkline datos={datos} />
        </StatCard>

        <StatCard
          icon={TrendingUpIcon}
          label="Máximo del período"
          meta={`${datos.length} días`}
          value={formatCop(maximo.valor)}
          delta={<Delta value={((ultimo.valor - maximo.valor) / maximo.valor) * 100} against="frente al máximo" />}
          hint={`Registrado el ${formatFecha(maximo.fecha)}`}
          action={{ label: "Ver días y variaciones", href: "/dias" }}
        />

        <StatCard
          icon={TriangleAlertIcon}
          label="Días atípicos"
          meta={`${DIAS_BARRAS} días`}
          value={
            <>
              {atipicos}
              <span className="text-base font-normal text-muted-foreground">/{datos.length}</span>
            </>
          }
          hint={`Variación de ${umbral}% o más frente al día anterior`}
          action={{ label: "Ver días y variaciones", href: "/dias" }}
        >
          <BarrasAtipicas datos={datos} />
        </StatCard>

        <StatCard
          icon={StarIcon}
          label="Alertas guardadas"
          value={String(ids.length)}
          hint="Días marcados para seguimiento"
          action={{ label: "Ver alertas guardadas", href: "/alertas" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrmChart datos={datos} />
        <AtipicosCard datos={datos} estaGuardado={estaGuardado} onAlternarAlerta={alternar} />
      </div>
    </>
  );
}

function ResumenSkeleton() {
  return (
    <div role="status" aria-label="Consultando la TRM en datos.gov.co" className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function ResumenView() {
  usePeriodo();

  return <TrmData loading={<ResumenSkeleton />}>{(datos) => <Resumen datos={datos} />}</TrmData>;
}
