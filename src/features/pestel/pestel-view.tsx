"use client";

import { useMemo, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildPestel } from "@/core/usecases/build-pestel";
import { getContainer } from "@/features/entorno/container";
import { useSignals } from "@/features/entorno/use-signals";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { useDecisionsStore } from "@/stores/decisions.store";
import { DecisionSheet, NEW_DECISION, type SheetTarget } from "./decision-sheet";
import { DecisionsSection } from "./decisions-section";
import { PESTEL_PERIOD_LABELS, type PestelPeriodMode, resolvePestelPeriod } from "./period";
import { FactorCard } from "./pestel-matrix";

const MODES = Object.keys(PESTEL_PERIOD_LABELS) as PestelPeriodMode[];

/** Environment signals sorted into the six PESTEL factors, and the decisions they inform. */
export function PestelView() {
  const data = useSignals();
  const decisions = useDecisionsStore((state) => state.decisions);
  const [mode, setMode] = useState<PestelPeriodMode>("30");
  const [dates, setDates] = useState<DayRange | undefined>();
  const [target, setTarget] = useState<SheetTarget>(null);
  const range = mode === "custom" ? dates : undefined;

  const period = useMemo(() => resolvePestelPeriod(getContainer().clock.now(), mode, range), [mode, range]);
  const factors = useMemo(() => (period.ok ? buildPestel(data.signals, period.value) : []), [data.signals, period]);
  const ready = data.hasHydrated && !data.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro description="Los avisos ordenados en seis factores: político, económico, social, tecnológico, ambiental y legal. Úsalo para pensar en las decisiones de la empresa."
      />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <ToggleGroup
            value={[mode]}
            variant="outline"
            size="sm"
            aria-label="Período de la lectura PESTEL"
            onValueChange={(next) => {
              const value = MODES.find((item) => item === next[0]);
              if (value) setMode(value);
            }}
          >
            {MODES.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {PESTEL_PERIOD_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {mode === "custom" && <DateRangeFilter value={dates} onChange={setDates} label="Rango PESTEL" />}
        </div>
        {mode === "custom" && !range && (
          <p className="text-xs text-muted-foreground">Elige las fechas. Mientras tanto se usan los últimos 30 días.</p>
        )}
        <p className="max-w-prose text-xs text-muted-foreground">
          El factor de cada aviso sale de una regla escrita. La tendencia compara conteos con el período anterior de igual
          duración. El impacto (oportunidad, amenaza o por evaluar) también sale de una tabla por regla, no de IA.
        </p>
        {data.trm.status === "error" && (
          <ErrorState source="la TRM" message={data.trm.errorMessage ?? "Error desconocido."} kind={data.trm.errorKind} onRetry={data.trm.retry} />
        )}
        {data.secop.status === "error" && (
          <ErrorState source="SECOP II" message={data.secop.errorMessage ?? "Error desconocido."} kind={data.secop.errorKind} onRetry={data.secop.retry} />
        )}
        {data.trm.isStale && <StaleNotice source="la TRM" updatedAt={data.trm.updatedAt} />}
        {data.secop.isStale && <StaleNotice source="SECOP II" updatedAt={data.secop.updatedAt} />}
      </div>

      {!period.ok && <ErrorState source="el período" message={period.error.message} />}

      {!ready ? (
        <Skeleton role="status" aria-label="Preparando la lectura PESTEL" className="h-96 rounded-xl" />
      ) : (
        <section aria-label="Matriz PESTEL" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {factors.map((summary) => (
            <FactorCard key={summary.pestel} summary={summary} />
          ))}
        </section>
      )}

      <DecisionsSection decisions={decisions} onOpen={setTarget} onCreate={() => setTarget(NEW_DECISION)} />
      <DecisionSheet target={target} signals={data.signals} onTargetChange={setTarget} />
    </div>
  );
}
