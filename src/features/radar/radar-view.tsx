"use client";

import { BellRingIcon, CircleDollarSignIcon, FileClockIcon, InboxIcon, UsersIcon } from "lucide-react";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { signalsContext } from "@/features/asistente/screen-contexts";
import { useCallback, useMemo, useState } from "react";
import { StatCard } from "@/components/shell/stat-card";
import { PageIntro } from "@/components/shell/page-intro";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dimension } from "@/core/domain/dimension";
import { DIMENSION_LABELS } from "@/core/labels";
import { isFollowed, signalSubject } from "@/core/rules/watch-subject";
import { SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID } from "@/core/rules/secop-competitor-new-contract";
import { SECOP_EXPIRING_CONTRACT_RULE_ID } from "@/core/rules/secop-expiring-contract";
import { AlertsGrid } from "@/features/alertas/alerts-grid";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { SignalDetailSheet } from "@/features/senales/signal-detail-sheet";
import { Delta } from "@/features/trm/delta";
import { procesar } from "@/features/trm/use-trm";
import { formatDiaBogota } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { usePreferencesStore } from "@/stores/preferences.store";
import { useWatchlistStore } from "@/stores/watchlist.store";
import { InboxLink } from "./inbox-link";
import type { Signal } from "@/core/domain/signal";
import { useAlertsStore } from "@/stores/alerts.store";

function byDimension(counts: Map<Dimension, number>): string {
  if (counts.size === 0) return "Sin alertas nuevas";
  return [...counts].map(([dimension, count]) => `${DIMENSION_LABELS[dimension]}: ${count}`).join(" · ");
}

export function RadarView() {
  const data = useSignals();
  const thresholds = usePreferencesStore((state) => state.thresholds);
  const allAlerts = useAlertsStore((state) => state.alerts);
  const rows = useAlertRows(data.signals);
  const [open, setOpen] = useState<Signal | null>(null);
  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const competitorNits = useWatchlistStore((state) => state.competitorNits);
  const indicators = useWatchlistStore((state) => state.indicators);

  const supplierNitByContractId = useMemo(
    () => new Map(data.contracts.map((contract) => [contract.id, contract.supplierNit])),
    [data.contracts],
  );
  const followed = useCallback(
    (signal: Signal) => !onlyFollowed || isFollowed(signalSubject(signal, supplierNitByContractId), { competitorNits, indicators }),
    [onlyFollowed, competitorNits, indicators, supplierNitByContractId],
  );

  const newRows = useMemo(
    () => rows.filter((row) => row.alert.state === "new" && followed(row.signal)),
    [rows, followed],
  );
  const allNewCount = useMemo(() => rows.filter((row) => row.alert.state === "new").length, [rows]);
  const counts = useMemo(() => {
    const map = new Map<Dimension, number>();
    for (const row of newRows) map.set(row.signal.dimension, (map.get(row.signal.dimension) ?? 0) + 1);
    return map;
  }, [newRows]);

  const today = useMemo(() => procesar(data.trmRecords, thresholds.trmDailyMovePct).at(-1), [data.trmRecords, thresholds]);
  const previous = useMemo(() => procesar(data.trmRecords, thresholds.trmDailyMovePct).at(-2), [data.trmRecords, thresholds]);
  const expiring = data.signals.filter((signal) => signal.ruleId === SECOP_EXPIRING_CONTRACT_RULE_ID).length;
  const competitors = data.signals.filter(
    (signal) => signal.ruleId === SECOP_COMPETITOR_NEW_CONTRACT_RULE_ID && followed(signal),
  ).length;

  const lastReview = allAlerts
    .filter((alert) => alert.state !== "new")
    .map((alert) => alert.updatedAt)
    .sort()
    .at(-1);

  const hiddenByFilter = onlyFollowed && newRows.length === 0 && allNewCount > 0;
  const secopReady = data.secop.status === "ready";
  const trmReady = data.trm.status === "ready";
  useRegisterPageContext(
    signalsContext("/", "Radar", newRows.map((row) => row.signal), {
      filters: { "solo mis seguimientos": onlyFollowed ? "sí" : undefined },
      keyNumbers: today ? [{ label: `TRM del ${today.fecha.slice(0, 10)} (COP por USD)`, value: String(today.valor) }] : [],
    }),
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Radar"
        description="Lo que cambió en el entorno y todavía no has revisado: el dólar, tus contratos públicos y los contratos de la competencia."
        actions={<FollowedFilterToggle />}
      />

      <div className="flex flex-col gap-2">
        {data.trm.status === "error" && (
          <ErrorState source="la TRM" message={data.trm.errorMessage ?? "Error desconocido."} kind={data.trm.errorKind} onRetry={data.trm.retry} />
        )}
        {data.secop.status === "error" && (
          <ErrorState source="SECOP II" message={data.secop.errorMessage ?? "Error desconocido."} kind={data.secop.errorKind} onRetry={data.secop.retry} />
        )}
        {data.trm.isStale && <StaleNotice source="la TRM" updatedAt={data.trm.updatedAt} />}
        {data.secop.isStale && <StaleNotice source="SECOP II" updatedAt={data.secop.updatedAt} />}
      </div>

      {data.isPending ? (
        <div role="status" aria-label="Consultando las fuentes" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
          <StatCard
            icon={CircleDollarSignIcon}
            label="TRM hoy"
            meta={today ? formatDiaBogota(today.fecha) : undefined}
            value={trmReady && today ? formatCop(today.valor) : "Sin dato"}
            delta={today ? <Delta value={today.variacionPct} against="frente al día anterior" /> : undefined}
            hint={previous ? `Día anterior: ${formatCop(previous.valor)}` : "La TRM no está disponible ahora."}
            action={{ label: "Ver días y variaciones", href: "/dias" }}
          />
          <StatCard
            icon={BellRingIcon}
            label="Alertas nuevas"
            value={String(newRows.length)}
            hint={byDimension(counts)}
            action={{ label: "Ver todas las alertas", href: "/alertas" }}
          />
          <StatCard
            icon={FileClockIcon}
            label="Contratos por vencer"
            meta={`${thresholds.contractExpiryWatchDays} días`}
            value={secopReady ? String(expiring) : "Sin dato"}
            hint={`Contratos de la empresa que terminan en ${thresholds.contractExpiryWatchDays} días o menos`}
            action={{ label: "Ver contratación", href: "/contratacion" }}
          />
          <StatCard
            icon={UsersIcon}
            label="Contratos de competidores"
            meta={`${thresholds.competitorContractWindowDays} días`}
            value={secopReady ? String(competitors) : "Sin dato"}
            hint={`Firmados en los últimos ${thresholds.competitorContractWindowDays} días`}
            action={{ label: "Ver contratación", href: "/contratacion" }}
          />
        </div>
      )}

      {!data.hasHydrated || data.isPending ? (
        <Skeleton role="status" aria-label="Cargando tus alertas" className="h-72 rounded-xl" />
      ) : (
        <AlertsGrid
          title="Alertas nuevas"
          icon={<InboxIcon aria-hidden="true" />}
          description="Revísalas o descártalas. Para descartar necesitas escribir una nota."
          rows={newRows}
          onOpen={setOpen}
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>{hiddenByFilter ? "Ninguna alerta nueva es de lo que sigues" : "No hay alertas nuevas"}</EmptyTitle>
                <EmptyDescription>
                  {hiddenByFilter
                    ? `Hay ${allNewCount} alertas nuevas fuera de tu lista. Desactiva «Solo mis seguimientos» para verlas.`
                    : lastReview
                      ? `Última revisión: ${formatDiaBogota(lastReview)}.`
                      : "Aún no has revisado ninguna alerta."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          footer={<InboxLink />}
        />
      )}

      <SignalDetailSheet signal={open} onOpenChange={(next) => !next && setOpen(null)} />
    </div>
  );
}
