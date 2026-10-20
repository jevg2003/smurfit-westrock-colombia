"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/states/error-state";
import { usePeriodo } from "./periodo";
import type { PuntoTrm } from "./types";
import { useTrm } from "./use-trm";

interface Props {
  /** Skeleton that mirrors the layout of `children`, shown while the series loads. */
  loading: ReactNode;
  children: (datos: PuntoTrm[]) => ReactNode;
}

/** Resolves the TRM series for the selected period and owns the loading and error states of a page. */
export function TrmData({ loading, children }: Props) {
  const { dias } = usePeriodo();
  const { data, isPending, isError, error, refetch } = useTrm(dias);

  if (isPending) return loading;

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Error desconocido al consultar la TRM"}
        onRetry={() => refetch()}
      />
    );
  }

  return children(data);
}
