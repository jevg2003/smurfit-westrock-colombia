"use client";

import { BellRingIcon, CircleDollarSignIcon, FileClockIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIMENSION_LABELS } from "@/core/labels";
import { Delta } from "@/features/trm/delta";
import { AlertStateBadge, DimensionBadge, SeverityBadge } from "@/features/avisos/badges";
import { LazyBeam } from "./lazy-beam";
import { LazyChart } from "./lazy-chart";
import { SAMPLE_ALERTS, SAMPLE_STATS } from "./sample-data";

const ICONS: Record<(typeof SAMPLE_STATS)[number]["id"], LucideIcon> = {
  trm: CircleDollarSignIcon,
  alertas: BellRingIcon,
  vencer: FileClockIcon,
  competidores: UsersIcon,
};

/**
 * A preview of the radar built from the app's own pieces (Card, Badge, Delta, chart container)
 * and fed with fixed sample data. It never reads a store or calls an API.
 */
export function RadarMockup() {
  return (
    <div
      aria-hidden="true"
      inert
      className="relative overflow-hidden rounded-2xl border bg-card/60 p-3 shadow-2xl shadow-primary/10 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">Radar</span>
          <span className="truncate text-xs text-muted-foreground">Lo que cambió en el entorno y todavía no has revisado</span>
        </div>
        <Badge variant="warning-light" size="lg" className="shrink-0">
          Datos de ejemplo
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_STATS.map((stat) => {
          const Icon = ICONS[stat.id];
          return (
            <Card key={stat.id} className="min-w-0 gap-0 py-0">
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex min-w-0 items-center gap-2 text-muted-foreground [&_svg:not([class*=size-])]:size-4">
                  <Icon aria-hidden="true" />
                  <span className="truncate text-sm font-medium text-foreground">{stat.label}</span>
                  <span className="ms-auto shrink-0 text-xs">{stat.meta}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">{stat.value}</span>
                    {"delta" in stat && <Delta value={stat.delta} against="frente al día anterior" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.hint}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-5">
        <Card className="min-w-0 gap-0 py-0 lg:col-span-3">
          <CardHeader className="border-b px-4 py-2 [.border-b]:pb-2">
            <CardTitle className="text-sm leading-5 font-semibold">Histórico de la TRM</CardTitle>
            <CardDescription>Serie de ejemplo de 30 días</CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <LazyChart />
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b px-4 py-2 [.border-b]:pb-2">
            <CardTitle className="text-sm leading-5 font-semibold">Alertas nuevas</CardTitle>
            <CardDescription>Cada una indica su origen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y px-0">
            {SAMPLE_ALERTS.map((alert) => (
              <div key={alert.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <DimensionBadge dimension={alert.dimension} />
                  <SeverityBadge severity={alert.severity} />
                  <AlertStateBadge state="new" />
                </div>
                <span className="text-sm">{alert.title}</span>
                <span className="text-xs text-muted-foreground">
                  Origen: {alert.origin} · {DIMENSION_LABELS[alert.dimension]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <LazyBeam />
    </div>
  );
}
