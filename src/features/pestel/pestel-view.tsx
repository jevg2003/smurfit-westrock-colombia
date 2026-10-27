"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/layouts/filter-bar";
import { ListDetailLayout } from "@/components/layouts/list-detail-layout";
import { SelectableList, SelectableRow } from "@/components/layouts/selectable-row";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { ErrorState } from "@/components/states/error-state";
import { SourceNotices } from "@/components/states/source-notices";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Pestel } from "@/core/domain/dimension";
import { buildPestel } from "@/core/usecases/build-pestel";
import { getContainer } from "@/features/entorno/container";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { useSignals } from "@/features/entorno/use-signals";
import { DateRangeFilter, type DayRange } from "@/features/filtros/date-range-filter";
import { useDecisionsStore } from "@/stores/decisions.store";
import { DecisionSheet, NEW_DECISION, type SheetTarget } from "./decision-sheet";
import { DecisionsSection } from "./decisions-section";
import { FactorDetail } from "./factor-detail";
import { PESTEL_PERIOD_LABELS, type PestelPeriodMode, resolvePestelPeriod } from "./period";

const MODES = Object.keys(PESTEL_PERIOD_LABELS) as PestelPeriodMode[];

/** Avisos sorted into the six PESTEL factors (political, economic, social, technological, environmental, legal) and the decisions they inform (L2). */
export function PestelView() {
  const data = useSignals();
  const decisions = useDecisionsStore((state) => state.decisions);
  const [mode, setMode] = useState<PestelPeriodMode>("30");
  const [dates, setDates] = useState<DayRange | undefined>();
  const [target, setTarget] = useState<SheetTarget>(null);
  const [selected, setSelected] = useState<Pestel | null>(null);
  const range = mode === "custom" ? dates : undefined;

  const period = useMemo(() => resolvePestelPeriod(getContainer().clock.now(), mode, range), [mode, range]);
  const factors = useMemo(() => (period.ok ? buildPestel(data.signals, period.value) : []), [data.signals, period]);
  const ready = data.hasHydrated && !data.isPending;
  const summaryOf = (factor: Pestel | null) => factors.find((item) => item.pestel === factor);
  const first = factors[0];

  return (
    <>
      <ListDetailLayout
        filters={
          <FilterBar active={mode !== "30" || dates !== undefined} onClear={() => (setMode("30"), setDates(undefined))}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Período</span>
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
            </div>
            {mode === "custom" && <DateRangeFilter value={dates} onChange={setDates} label="Rango PESTEL" />}
          </FilterBar>
        }
        notices={
          <div className="flex shrink-0 flex-col gap-2">
            {mode === "custom" && !range && <p className="text-xs text-muted-foreground">Elija las fechas. Mientras tanto se usan los últimos 30 días.</p>}
            <p className="max-w-prose text-xs text-muted-foreground">
              El factor de cada aviso sale de una regla escrita. La tendencia compara conteos con el período anterior de igual duración. El impacto (oportunidad, amenaza o por evaluar) también sale de una tabla por regla, no de IA.
            </p>
            <SourceNotices sources={[{ name: "la TRM", ...data.trm }, { name: "SECOP II", ...data.secop }]} />
            {!period.ok && <ErrorState source="el período" message={period.error.message} />}
          </div>
        }
        listLabel="Factores PESTEL"
        list={
          <div className="flex flex-col gap-6">
            {!ready ? (
              <EventListSkeleton label="Preparando la lectura PESTEL" rows={6} />
            ) : (
              <section aria-label="Matriz PESTEL">
                <SelectableList label="Factores">
                  {factors.map((summary) => (
                    <SelectableRow
                      key={summary.pestel}
                      title={PESTEL_LABELS[summary.pestel]}
                      subtitle={summary.total === 0 ? "Sin avisos en este período" : `${summary.total} ${summary.total === 1 ? "aviso" : "avisos"}`}
                      badge={summary.bySeverity.alert > 0 ? { label: `${summary.bySeverity.alert} en alerta`, tone: "high" } : undefined}
                      selected={summary.pestel === (selected ?? first?.pestel)}
                      onSelect={() => setSelected(summary.pestel)}
                    />
                  ))}
                </SelectableList>
              </section>
            )}
            <DecisionsSection decisions={decisions} onOpen={setTarget} onCreate={() => setTarget(NEW_DECISION)} />
          </div>
        }
        detail={ready && selected && summaryOf(selected) ? <FactorDetail summary={summaryOf(selected)!} /> : null}
        desktopDetail={ready && first ? <FactorDetail summary={summaryOf(selected) ?? first} /> : null}
        detailLabel="Detalle del factor"
        onCloseDetail={() => setSelected(null)}
      />
      <DecisionSheet target={target} signals={data.signals} onTargetChange={setTarget} />
    </>
  );
}
