"use client";

import { StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TrmData } from "@/features/trm/trm-data";
import { TrmGrid } from "@/features/trm/trm-grid";
import Link from "next/link";
import { useAlertas } from "./use-alertas";

export function AlertasView() {
  const { ids, estaGuardado, alternar, hasHydrated } = useAlertas();

  return (
    <TrmData
      loading={<Skeleton role="status" aria-label="Consultando la TRM en datos.gov.co" className="h-96 rounded-xl" />}
    >
      {(datos) => {
        if (!hasHydrated) {
          return <Skeleton role="status" aria-label="Cargando tus alertas guardadas" className="h-96 rounded-xl" />;
        }
        const guardados = datos.filter((punto) => ids.includes(punto.fecha));

        return guardados.length === 0 ? (
          <Empty className="flex-1 border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Sin alertas en este período</EmptyTitle>
              <EmptyDescription>Guarda un día desde la tabla de días y variaciones para seguirlo aquí.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" nativeButton={false} render={<Link href="/dias" />}>
                Ver días y variaciones
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <TrmGrid
            title="Alertas guardadas"
            icon={<StarIcon aria-hidden="true" />}
            datos={guardados}
            estaGuardado={estaGuardado}
            onAlternarAlerta={alternar}
            ocultarFiltro
          />
        );
      }}
    </TrmData>
  );
}
