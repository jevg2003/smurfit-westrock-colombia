"use client";

import { useCallback, useMemo } from "react";
import type { PublicContract } from "@/core/domain/contract";
import type { Signal } from "@/core/domain/signal";
import { isFollowed, signalSubject } from "@/core/rules/watch-subject";
import { useWatchlistStore } from "@/stores/watchlist.store";

/** Whether an aviso belongs to what the user follows; true for everything while "Solo lo que sigo" is off. */
export function useFollowed(contracts: readonly PublicContract[]) {
  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);
  const supplierNitByContractId = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract.supplierNit])), [contracts]);
  const followed = useCallback(
    (signal: Signal) => !onlyFollowed || isFollowed(signalSubject(signal, supplierNitByContractId), { competitorNits, indicators }),
    [onlyFollowed, competitorNits, indicators, supplierNitByContractId],
  );
  return { onlyFollowed, followed };
}
