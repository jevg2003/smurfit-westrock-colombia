"use client";

import { useMemo, useState } from "react";
import { ListDetailLayout } from "@/components/layouts/list-detail-layout";
import { SelectableList, SelectableRow } from "@/components/layouts/selectable-row";
import { EventListSkeleton } from "@/components/states/event-list-skeleton";
import { RegionEmpty } from "@/components/states/region-empty";
import { SourceNotices } from "@/components/states/source-notices";
import { namesByNit, withNitCompetitors } from "@/core/company/profile";
import { latestFinancialsByNit } from "@/core/rules/financials";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { contractsContext } from "@/features/asistente/screen-contexts";
import { useSecop } from "@/features/entorno/use-secop";
import { useSupersociedades } from "@/features/entorno/use-supersociedades";
import { useCompany } from "@/stores/companies.store";
import { CompetitorDetail } from "./competitor-detail";

/** Size and profitability of each competitor next to the company, and the public contracts they signed (L2). */
export function CompetidoresView() {
  const company = useCompany();
  const competitors = useMemo(() => withNitCompetitors(company), [company]);
  const names = useMemo(() => namesByNit(company), [company]);
  const finances = useSupersociedades();
  const secop = useSecop();
  const [selected, setSelected] = useState<string | null>(null);

  const latest = useMemo(() => latestFinancialsByNit(finances.data?.financials ?? []), [finances.data]);
  const rows = useMemo(
    () => (secop.data?.contracts ?? []).filter((contract) => competitors.some((competitor) => competitor.nit === contract.supplierNit)),
    [secop.data, competitors],
  );
  const companies = useMemo(
    () => [
      ...(company.nit ? [{ name: company.name, nit: company.nit, isCompany: true }] : []),
      ...competitors.map((competitor) => ({ ...competitor, isCompany: false })),
    ],
    [company, competitors],
  );
  useRegisterPageContext(contractsContext("/economia", "Competidores", rows, [{ label: "Competidores", value: competitors.map((c) => c.name).join(", ") }]));

  // Without a choice the first competitor is shown, so the pane is never empty beside a list.
  const current = companies.find((item) => item.nit === selected) ?? companies.find((item) => !item.isCompany) ?? companies[0];
  const detailOf = (item: (typeof companies)[number] | undefined) =>
    item ? (
      <CompetitorDetail
        key={item.nit}
        name={names.get(item.nit) ?? item.name}
        nit={item.nit}
        isCompany={item.isCompany}
        financials={latest.get(item.nit)}
        contracts={rows.filter((contract) => contract.supplierNit === item.nit)}
        contractsReady={secop.view.status === "ready"}
        fetchedAt={finances.view.updatedAt}
      />
    ) : null;
  const noFigures = finances.view.status === "ready" && !finances.data?.financials.length;

  return (
    <ListDetailLayout
      notices={<SourceNotices sources={[{ name: "Supersociedades", ...finances.view }, { name: "SECOP II", ...secop.view }]} />}
      listLabel="Lista de empresas"
      list={
        finances.view.status === "pending" ? (
          <EventListSkeleton label="Consultando Supersociedades" rows={Math.max(companies.length, 2)} />
        ) : companies.length === 0 ? (
          <RegionEmpty title="No hay competidores configurados" description="Agréguelos en Configuración para compararlos." action={{ label: "Ir a Configuración", href: "/configuracion?tab=reglas" }} />
        ) : (
          <>
            {noFigures && <p className="px-3 pb-2 text-sm text-muted-foreground">Supersociedades no devolvió cifras para estas empresas. Puede ser un fallo temporal de datos.gov.co.</p>}
            <SelectableList label="Empresas">
              {companies.map((item) => (
                <SelectableRow
                  key={item.nit}
                  title={names.get(item.nit) ?? item.name}
                  subtitle={`NIT ${item.nit}`}
                  badge={{ label: item.isCompany ? "Empresa" : "Competidor", tone: "neutral" }}
                  selected={item.nit === current?.nit}
                  onSelect={() => setSelected(item.nit)}
                />
              ))}
            </SelectableList>
          </>
        )
      }
      detail={selected ? detailOf(companies.find((item) => item.nit === selected)) : null}
      desktopDetail={detailOf(current)}
      detailLabel="Detalle de la empresa"
      onCloseDetail={() => setSelected(null)}
    />
  );
}
