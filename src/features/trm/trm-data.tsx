"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { usePeriodo } from "./periodo";
import type { PuntoTrm } from "./types";
import { useTrm } from "./use-trm";

/** Resolves the TRM series for the selected period and renders loading/error states around it. */
export function TrmData({ children }: { children: (datos: PuntoTrm[]) => ReactNode }) {
  const { dias } = usePeriodo();
  const { data, isPending, isError, error, refetch } = useTrm(dias);

  if (isPending) return <LoadingState message="Consultando la TRM en datos.gov.co…" />;

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "error desconocido"}
        onRetry={() => refetch()}
      />
    );
  }

  return children(data);
}
