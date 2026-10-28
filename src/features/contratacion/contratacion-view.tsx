"use client";

import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EventItem, type EventTone } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { FilterBar } from "@/components/layouts/filter-bar";
import { FilterSelect } from "@/components/layouts/filter-select";
import { ListDetailLayout } from "@/components/layouts/list-detail-layout";
import { useFilterValues } from "@/components/layouts/use-filter-values";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { Button } from "@/components/ui/button";
import { contractExpiry, type ExpiryLevel } from "@/core/rules/contract-expiry";
import { bogotaDateKey } from "@/core/time/bogota";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { contractsContext } from "@/features/asistente/screen-contexts";
import { getContainer } from "@/features/entorno/container";
import { SOURCES } from "@/features/entorno/sources";
import { useSecop } from "@/features/entorno/use-secop";
import { downloadCsv } from "@/lib/download";
import { formatCop } from "@/lib/money";
import { useCompany } from "@/stores/companies.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { ContractDetail } from "./contract-detail";
import { contractsToCsv } from "./contracts-csv";

/** Contracts rendered at a time; "Ver más" adds this many. */
const PAGE_SIZE = 30;

const TONE: Record<ExpiryLevel, EventTone> = { alert: "high", watch: "medium", ok: "positive", neutral: "neutral" };
const EXPIRY_OPTIONS = [
  { value: "alert", label: "En alerta" },
  { value: "watch", label: "En vigilancia" },
  { value: "ok", label: "Vigentes" },
  { value: "neutral", label: "Terminados o sin fecha" },
];

/** Public contracts (SECOP, contratación pública) of the company NIT, with the expiry window of each (L2). */
export function ContratacionView() {
  const company = useCompany();
  const { view, data } = useSecop();
  const thresholds = usePreferencesStore((state) => state.thresholds);
  const expiry = useMemo(() => ({ watchDays: thresholds.contractExpiryWatchDays, alertDays: thresholds.contractExpiryAlertDays }), [thresholds]);
  const now = getContainer().clock.now();
  const [openId, setOpenId] = useState<string | null>(null);
  const { values, set: setFilter, clear: clearFilters, active } = useFilterValues({ expiry: "", status: "" });
  const [limit, setLimit] = useState(PAGE_SIZE);
  // A new filter starts from the first page again.
  const set = (key: "expiry" | "status", value: string) => {
    setLimit(PAGE_SIZE);
    setFilter(key, value);
  };
  const clear = () => {
    setLimit(PAGE_SIZE);
    clearFilters();
  };

  const rows = useMemo(() => (data?.contracts ?? []).filter((contract) => contract.supplierNit === company.nit), [data, company.nit]);
  const statuses = useMemo(() => [...new Set(rows.map((contract) => contract.status))].sort().map((status) => ({ value: status, label: status })), [rows]);
  const shown = useMemo(
    () =>
      rows
        .filter((contract) => (!values.status || contract.status === values.status) && (!values.expiry || contractExpiry(contract, now, expiry).level === values.expiry))
        .sort((a, b) => Date.parse(b.signedAt) - Date.parse(a.signedAt)),
    [rows, values, expiry, now],
  );
  const open = rows.find((contract) => contract.id === openId) ?? null;
  useRegisterPageContext(contractsContext("/economia", "Contratación", rows));

  return (
    <ListDetailLayout
      filters={
        <FilterBar
          active={active}
          onClear={clear}
          trailing={
            <Button variant="outline" size="sm" disabled={shown.length === 0} onClick={() => downloadCsv(`contratos-${bogotaDateKey(now)}.csv`, contractsToCsv(shown, now, expiry))}>
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Exportar CSV
            </Button>
          }
        >
          <FilterSelect label="Vencimiento" value={values.expiry} options={EXPIRY_OPTIONS} onChange={(value) => set("expiry", value)} />
          <FilterSelect label="Estado" value={values.status} options={statuses} onChange={(value) => set("status", value)} />
        </FilterBar>
      }
      notices={<SourceNotices sources={[{ name: "SECOP II", ...view }]} />}
      listLabel="Lista de contratos"
      list={
        view.status === "pending" ? (
          <EventListSkeleton label="Consultando SECOP II en datos.gov.co" />
        ) : view.status === "ready" ? (
          shown.length === 0 ? (
            <RegionEmpty
              title={rows.length === 0 ? "No hay contratos en los últimos 12 meses para este NIT" : "Ningún contrato cumple estos filtros"}
              description={rows.length === 0 ? `SECOP II no devolvió contratos firmados por el NIT ${company.nit ?? "de la empresa"} desde hace un año.` : "Quite un filtro para ver más."}
              action={rows.length > 0 && active ? { label: "Limpiar filtros", onClick: clear } : undefined}
            />
          ) : (
            <>
              <EventList
                label="Contratos"
                items={shown.slice(0, limit).map((contract) => ({ contract, at: contract.signedAt }))}
                getKey={({ contract }) => contract.id}
                renderItem={({ contract }) => {
                  const result = contractExpiry(contract, now, expiry);
                  return (
                    <EventItem
                      title={contract.entity}
                      at={contract.signedAt}
                      source="SECOP II"
                      topic={formatCop(contract.value)}
                      badge={{ label: result.label, tone: TONE[result.level] }}
                      detail={`Estado: ${contract.status}`}
                      selected={contract.id === openId}
                      onOpen={() => setOpenId(contract.id)}
                    />
                  );
                }}
              />
              {shown.length > limit && (
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {limit} de {shown.length}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                    Ver más
                  </Button>
                </div>
              )}
              <div className="px-3 py-2">
                <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={view.updatedAt} />
              </div>
            </>
          )
        ) : null
      }
      detail={open ? <ContractDetail contract={open} expiry={contractExpiry(open, now, expiry)} fetchedAt={view.updatedAt} /> : null}
      detailLabel="Detalle del contrato"
      onCloseDetail={() => setOpenId(null)}
    />
  );
}
