"use client";

import { DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DateRangeFilter } from "@/features/filtros/date-range-filter";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { ListDetailLayout } from "@/components/layouts/list-detail-layout";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Button } from "@/components/ui/button";
import { PESTEL_ORDER } from "@/core/usecases/build-pestel";
import { bogotaDateKey } from "@/core/time/bogota";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { signalsContext } from "@/features/asistente/screen-contexts";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { SOURCES } from "@/features/entorno/sources";
import { useAlertRows, useSignals } from "@/features/entorno/use-signals";
import { FollowedFilterToggle } from "@/features/seguimiento/followed-filter-toggle";
import { useFollowed } from "@/features/seguimiento/use-followed";
import { downloadCsv } from "@/lib/download";
import { alertRowsToCsv } from "./alerts-csv";
import { AlertEvents } from "./alert-events";
import type { AlertRow } from "./alert-row";
import { SignalDetail } from "./signal-detail";
import { SEVERITY_OPTIONS, STATE_OPTIONS, TOPIC_OPTIONS, useAlertFilters } from "./use-alert-filters";

/**
 * Every aviso the rules produce, as one list with a fixed detail pane (L2). The review state (nuevo,
 * revisado, descartado) is a filter: dismissed avisos stay out until Estado asks for them.
 */
export function AvisosView() {
  const data = useSignals();
  const pestelParam = useSearchParams()?.get("pestel");
  const pestel = PESTEL_ORDER.find((factor) => factor === pestelParam);
  const { onlyFollowed, followed } = useFollowed(data.contracts);
  const alertRows = useAlertRows(data.signals);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => alertRows.filter((row) => (!pestel || row.signal.pestel === pestel) && followed(row.signal)),
    [alertRows, pestel, followed],
  );
  const filters = useAlertFilters(rows, { withState: true });
  const open = filters.filtered.find((row) => row.signal.id === openId) ?? rows.find((row) => row.signal.id === openId) ?? null;
  const ready = data.hasHydrated && !data.isPending;
  useRegisterPageContext(
    signalsContext("/resumen", "Avisos", filters.filtered.map((row) => row.signal), { filters: { "solo lo que sigo": onlyFollowed ? "sí" : undefined } }),
  );

  return (
    <ListDetailLayout
      filters={
        <FilterBar
          active={filters.isFiltering}
          onClear={filters.clear}
          trailing={
            <Button
              variant="outline"
              size="sm"
              disabled={filters.filtered.length === 0}
              onClick={() => downloadCsv(`avisos-${bogotaDateKey(new Date())}.csv`, alertRowsToCsv(filters.filtered))}
            >
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
        >
          <FilterSelect label="Estado" value={filters.values.state} options={STATE_OPTIONS} allLabel="Nuevos y revisados" onChange={(value) => filters.set("state", value)} />
          <FilterSelect label="Gravedad" value={filters.values.severity} options={SEVERITY_OPTIONS} onChange={(value) => filters.set("severity", value)} />
          <FilterSelect label="Tema" value={filters.values.dimension} options={TOPIC_OPTIONS} onChange={(value) => filters.set("dimension", value)} />
          <DateRangeFilter value={filters.dates} onChange={filters.setDates} label="Período" />
          <FollowedFilterToggle />
        </FilterBar>
      }
      notices={<SourceNotices sources={[{ name: "la TRM", ...data.trm }, { name: "SECOP II", ...data.secop }]} />}
      listLabel="Lista de avisos"
      list={
        !ready ? (
          <EventListSkeleton label="Consultando los avisos" />
        ) : (
          <AvisosList rows={filters.filtered} filters={filters} pestel={pestel} onlyFollowed={onlyFollowed} openId={openId} onOpen={(row) => setOpenId(row.signal.id)} data={data} />
        )
      }
      detail={open ? <SignalDetail key={open.signal.id} signal={open.signal} onDone={() => setOpenId(null)} /> : null}
      detailLabel="Detalle del aviso"
      onCloseDetail={() => setOpenId(null)}
    />
  );
}

interface ListProps {
  rows: AlertRow[];
  filters: ReturnType<typeof useAlertFilters>;
  pestel: (typeof PESTEL_ORDER)[number] | undefined;
  onlyFollowed: boolean;
  openId: string | null;
  onOpen: (row: AlertRow) => void;
  data: ReturnType<typeof useSignals>;
}

function AvisosList({ rows, filters, pestel, onlyFollowed, openId, onOpen, data }: ListProps) {
  return (
    <div className="flex flex-col gap-2">
      {pestel && (
        <p className="px-3 text-sm">
          Mostrando solo el factor PESTEL <span className="font-medium">{PESTEL_LABELS[pestel]}</span>.{" "}
          <Link href="/resumen?tab=avisos" className="underline underline-offset-4">
            Ver todos los avisos
          </Link>
        </p>
      )}
      {filters.hiddenDismissed > 0 && (
        <p className="px-3 text-xs text-muted-foreground">Los descartados no se muestran ({filters.hiddenDismissed}). Use el filtro Estado para verlos.</p>
      )}

      {rows.length === 0 ? (
        <RegionEmpty
          title="No hay avisos para mostrar"
          description={
            filters.isFiltering
              ? "Ningún aviso cumple estos filtros."
              : onlyFollowed
                ? "Ningún aviso es de lo que sigue. Desactive «Solo lo que sigo» para ver todos."
                : "Ninguna regla se activó con los datos de hoy. Puede ajustar las reglas en Configuración."
          }
          action={filters.isFiltering ? { label: "Limpiar filtros", onClick: filters.clear } : undefined}
        />
      ) : (
        <AlertEvents rows={rows} selectedId={openId ?? undefined} onOpen={onOpen} />
      )}

      <div className="flex flex-col gap-1 px-3 py-2">
        <ProvenanceNote attribution={SOURCES.trm.attribution} license={SOURCES.trm.license} fetchedAt={data.trm.updatedAt} />
        <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={data.secop.updatedAt} />
      </div>
    </div>
  );
}
