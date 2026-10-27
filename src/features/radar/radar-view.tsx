"use client";

import { useMemo, useState } from "react";
import { FeedSummary, type SummaryFact } from "@/components/events/feed-summary";
import { FeedLayout } from "@/components/layouts/feed-layout";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { hasNit } from "@/core/company/profile";
import type { Dimension } from "@/core/domain/dimension";
import { DIMENSION_LABELS } from "@/core/labels";
import { SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID } from "@/core/rules/secop-competitor-new-contract";
import { SECOP_EXPIRING_CONTRACT_RULE_ID } from "@/core/rules/secop-expiring-contract";
import { AlertEvents } from "@/features/avisos/alert-events";
import type { AlertRow } from "@/features/avisos/alert-row";
import { SignalDetailSheet } from "@/features/avisos/signal-detail-sheet";
import { SEVERITY_OPTIONS, TOPIC_OPTIONS } from "@/features/avisos/use-alert-filters";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { signalsContext } from "@/features/asistente/screen-contexts";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { useFollowed } from "@/features/seguimiento/use-followed";
import { Delta } from "@/features/trm/delta";
import { procesar } from "@/features/trm/use-trm";
import { formatDiaBogota } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { useAlertsStore } from "@/stores/alerts.store";
import { useActiveCompany } from "@/stores/companies.store";
import { usePreferencesStore } from "@/stores/preferences.store";

/** Inbox of what changed and has not been reviewed yet (L1), with counts that also filter. */
export function RadarView() {
  const data = useSignals();
  const thresholds = usePreferencesStore((state) => state.thresholds);
  const allAlerts = useAlertsStore((state) => state.alerts);
  const rows = useAlertRows(data.signals);
  const [open, setOpen] = useState<string | null>(null);
  const company = useActiveCompany();
  const withContracts = company ? hasNit(company) : false;
  const { onlyFollowed, followed } = useFollowed(data.contracts);
  const { values, set, clear, active } = useFilterValues({ severity: "", dimension: "" });

  const newRows = useMemo(() => rows.filter((row) => row.alert.state === "new" && followed(row.signal)), [rows, followed]);
  const allNewCount = useMemo(() => rows.filter((row) => row.alert.state === "new").length, [rows]);
  const shown = useMemo(
    () => newRows.filter((row) => (!values.severity || row.signal.severity === values.severity) && (!values.dimension || row.signal.dimension === values.dimension)),
    [newRows, values],
  );
  const counts = useMemo(() => {
    const map = new Map<Dimension, number>();
    for (const row of newRows) map.set(row.signal.dimension, (map.get(row.signal.dimension) ?? 0) + 1);
    return map;
  }, [newRows]);

  const trmDays = useMemo(() => procesar(data.trmRecords, thresholds.trmDailyMovePct), [data.trmRecords, thresholds]);
  const today = trmDays.at(-1);
  const expiring = data.signals.filter((signal) => signal.ruleId === SECOP_EXPIRING_CONTRACT_RULE_ID).length;
  const competitors = data.signals.filter((signal) => signal.ruleId === SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID && followed(signal)).length;
  const lastReview = allAlerts
    .filter((alert) => alert.state !== "new")
    .map((alert) => alert.updatedAt)
    .sort()
    .at(-1);

  const hiddenByFilter = onlyFollowed && newRows.length === 0 && allNewCount > 0;
  const secopReady = data.secop.status === "ready";
  const trmReady = data.trm.status === "ready";
  useRegisterPageContext(
    signalsContext("/resumen", "Radar", shown.map((row) => row.signal), {
      filters: { "solo lo que sigo": onlyFollowed ? "sí" : undefined },
      keyNumbers: today ? [{ label: `TRM del ${today.fecha.slice(0, 10)} (COP por USD)`, value: String(today.valor) }] : [],
    }),
  );

  const facts: SummaryFact[] = [
    {
      label: "TRM hoy",
      href: "/economia?tab=trm",
      value:
        trmReady && today ? (
          <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2">
            <span title={formatDiaBogota(today.fecha)}>{formatCop(today.valor)}</span>
            <Delta value={today.variacionPct} against="frente al día anterior" />
          </span>
        ) : (
          "Sin dato"
        ),
    },
    ...(withContracts
      ? [
          { label: "Contratos por vencer", href: "/economia?tab=contratacion", value: secopReady ? expiring : "Sin dato" },
          { label: "Contratos de competidores", href: "/economia?tab=contratacion", value: secopReady ? competitors : "Sin dato" },
        ]
      : []),
  ];

  const ready = data.hasHydrated && !data.isPending;
  const openRow: AlertRow | undefined = rows.find((row) => row.signal.id === open);

  return (
    <>
      <FeedLayout
        filters={
          <FilterBar active={active} onClear={clear}>
            <FilterSelect label="Gravedad" value={values.severity} options={SEVERITY_OPTIONS} onChange={(value) => set("severity", value)} />
            <FilterSelect label="Tema" value={values.dimension} options={TOPIC_OPTIONS} onChange={(value) => set("dimension", value)} />
            <FollowedFilterToggle />
          </FilterBar>
        }
        notices={<SourceNotices sources={[{ name: "la TRM", ...data.trm }, { name: "SECOP II", ...data.secop }]} />}
        asideLabel="Resumen del radar"
        aside={
          ready && (
            <FeedSummary
              total={newRows.length}
              totalLabel={newRows.length === 1 ? "aviso sin revisar" : "avisos sin revisar"}
              groups={[
                {
                  title: "Por tema",
                  selected: values.dimension,
                  onSelect: (value) => set("dimension", value),
                  options: [...counts].map(([dimension, count]) => ({ value: dimension, label: DIMENSION_LABELS[dimension], count })),
                },
              ]}
              facts={facts}
            />
          )
        }
      >
        {!ready ? (
          <EventListSkeleton label="Consultando las fuentes" />
        ) : shown.length === 0 ? (
          <RegionEmpty
            title={hiddenByFilter ? "Ningún aviso nuevo es de lo que sigue" : active && newRows.length > 0 ? "Ningún aviso cumple estos filtros" : "No hay avisos nuevos"}
            description={
              hiddenByFilter
                ? `Hay ${allNewCount} avisos nuevos fuera de su lista. Desactive «Solo lo que sigo» para verlos.`
                : active && newRows.length > 0
                  ? "Quite un filtro para ver más."
                  : lastReview
                    ? `Última revisión: ${formatDiaBogota(lastReview)}.`
                    : "Aún no ha revisado ningún aviso."
            }
            action={active ? { label: "Limpiar filtros", onClick: clear } : undefined}
          />
        ) : (
          <AlertEvents rows={shown} onOpen={(row) => setOpen(row.signal.id)} />
        )}
      </FeedLayout>
      <SignalDetailSheet signal={openRow?.signal ?? null} onOpenChange={(next) => !next && setOpen(null)} />
    </>
  );
}
