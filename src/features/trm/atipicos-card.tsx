"use client";

import { StarIcon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { formatFecha } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Delta } from "./delta";
import type { PuntoTrm } from "./types";
import { UMBRAL_ATIPICO_PCT } from "./use-trm";

const MAXIMO_FILAS = 5;

interface Props {
  datos: PuntoTrm[];
  estaGuardado: (fecha: string) => boolean;
  onAlternarAlerta: (fecha: string) => void;
}

export function AtipicosCard({ datos, estaGuardado, onAlternarAlerta }: Props) {
  const atipicos = datos
    .filter((punto) => punto.atipico)
    .sort((a, b) => Math.abs(b.variacionPct ?? 0) - Math.abs(a.variacionPct ?? 0));
  const visibles = atipicos.slice(0, MAXIMO_FILAS);

  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-2 [.border-b]:pb-2">
        <div className="flex min-w-0 flex-col gap-px">
          <CardTitle className="text-sm leading-5 font-semibold">Variaciones atípicas</CardTitle>
          <CardDescription>
            {atipicos.length === 0
              ? `Ningún día llegó a ${UMBRAL_ATIPICO_PCT}%`
              : `${visibles.length} de ${atipicos.length}, mayor variación primero`}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 py-4">
        {visibles.length === 0 ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyTitle>Sin variaciones atípicas</EmptyTitle>
              <EmptyDescription>
                Se marcan los días con {UMBRAL_ATIPICO_PCT}% o más de cambio frente al día anterior.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {visibles.map((punto) => {
              const guardada = estaGuardado(punto.fecha);
              const sube = (punto.variacionPct ?? 0) > 0;

              return (
                <Item key={punto.fecha} size="xs" className="px-0">
                  <ItemContent>
                    <ItemTitle className="gap-2">
                      <span className="truncate tabular-nums">{formatFecha(punto.fecha)}</span>
                      <Badge variant={sube ? "info-light" : "destructive-light"} size="xs">
                        {sube ? "Sube" : "Baja"}
                      </Badge>
                    </ItemTitle>
                  </ItemContent>
                  <Delta value={punto.variacionPct} against="frente al día anterior" />
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-pressed={guardada}
                      aria-label={`${guardada ? "Quitar de" : "Guardar en"} alertas el ${formatFecha(punto.fecha)}`}
                      onClick={() => onAlternarAlerta(punto.fecha)}
                    >
                      <StarIcon aria-hidden="true" className={cn(guardada && "fill-current text-warning")} />
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
