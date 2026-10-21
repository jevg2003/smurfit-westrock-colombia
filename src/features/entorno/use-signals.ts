"use client";

import { useEffect, useMemo } from "react";
import { COMPANY, COMPETITORS } from "@/content/config/empresa";
import type { Alert } from "@/core/domain/alert";
import type { Signal } from "@/core/domain/signal";
import { DEFAULT_SIGNAL_RULES } from "@/core/rules/default-rules";
import { detectSignals } from "@/core/usecases/detect-signals";
import { useAlertsStore } from "@/stores/alerts.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { getContainer } from "./container";
import { useSecop } from "./use-secop";
import { useTrmRecords } from "./use-trm-records";

/** A signal and, once the store has it, its alert. */
export interface SignalRow {
  signal: Signal;
  alert?: Alert;
}

/**
 * Signals from the fetched data and the active thresholds. A failing source only removes its own
 * signals. Every signal that fires gets an alert (state `new`) once the stores are hydrated.
 */
export function useSignals() {
  const thresholds = usePreferencesStore((state) => state.thresholds);
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const createFromSignal = useAlertsStore((state) => state.createFromSignal);
  const trm = useTrmRecords();
  const secop = useSecop();

  const contracts = secop.data?.contracts;
  const trmRecords = trm.data;
  const trmUpdatedAt = trm.query.dataUpdatedAt;

  const signals = useMemo<Signal[]>(() => {
    if (!contracts && !trmRecords) return [];
    const clock = getContainer().clock;
    return detectSignals(
      {
        contracts: contracts ?? [],
        trmRecords: (trmRecords ?? []).map((record) => ({ validFrom: record.vigenciadesde, value: record.valor })),
        trmFetchedAt: new Date(trmUpdatedAt || clock.now().getTime()).toISOString(),
        companyNit: COMPANY.nit,
        competitors: COMPETITORS,
      },
      DEFAULT_SIGNAL_RULES,
      clock,
      thresholds,
    );
  }, [contracts, trmRecords, trmUpdatedAt, thresholds]);

  useEffect(() => {
    if (!hasHydrated) return;
    for (const signal of signals) createFromSignal(signal);
  }, [hasHydrated, signals, createFromSignal]);

  return {
    signals,
    contracts: contracts ?? [],
    trmRecords: trmRecords ?? [],
    trm: trm.view,
    secop: secop.view,
    secopProvenance: secop.data?.provenance,
    isPending: trm.view.status === "pending" && secop.view.status === "pending",
    hasHydrated,
  };
}

/** Alerts joined with the live signal when it still fires (so rule text shows the active threshold). */
export function useAlertRows(signals: readonly Signal[]): Required<SignalRow>[] {
  const alerts = useAlertsStore((state) => state.alerts);
  return useMemo(() => {
    const live = new Map(signals.map((signal) => [signal.id, signal]));
    return alerts.map((alert) => ({ alert, signal: live.get(alert.signalId) ?? alert.signalSnapshot }));
  }, [alerts, signals]);
}
