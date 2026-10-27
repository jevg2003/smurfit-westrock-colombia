"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRegisterPageContext } from "@/features/asistente/page-context";
import { contractsContext } from "@/features/asistente/screen-contexts";
import { ExternalLinkIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataTableCard } from "@/components/shell/data-table-card";
import { PageIntro } from "@/components/shell/page-intro";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { ErrorState } from "@/components/states/error-state";
import { StaleNotice } from "@/components/states/stale-notice";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { namesByNit, withNitCompetitors } from "@/core/company/profile";
import type { PublicContract } from "@/core/domain/contract";
import { latestFinancialsByNit } from "@/core/rules/financials";
import { SOURCES } from "@/features/entorno/sources";
import { useCompany } from "@/stores/companies.store";
import { useSecop } from "@/features/entorno/use-secop";
import { useSupersociedades } from "@/features/entorno/use-supersociedades";
import { formatDiaBogota } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { safeHttpUrl } from "@/lib/safe-url";
import { CompanyCard } from "./company-card";

/** Columns of the competitor contracts table; `names` maps a watched NIT to the name the company uses for it. */
const buildColumns = (names: ReadonlyMap<string, string>): ColumnDef<DataGridFeatures, PublicContract>[] => [
  {
    id: "supplier",
    accessorFn: (row) => names.get(row.supplierNit) ?? row.supplierName,
    header: ({ column }) => <DataGridColumnHeader title="Competidor" column={column} />,
    cell: ({ row }) => <span className="font-medium whitespace-normal">{names.get(row.original.supplierNit) ?? row.original.supplierName}</span>,
    size: 190,
    enableHiding: false,
  },
  {
    id: "entity",
    accessorFn: (row) => row.entity,
    header: ({ column }) => <DataGridColumnHeader title="Entidad" column={column} />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col py-1">
        <span className="whitespace-normal">{row.original.entity}</span>
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      </div>
    ),
    size: 280,
    enableHiding: false,
  },
  {
    id: "value",
    accessorFn: (row) => row.value,
    header: ({ column }) => <DataGridColumnHeader title="Valor" column={column} />,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatCop(row.original.value)}</span>,
    size: 150,
    enableHiding: false,
  },
  {
    id: "signedAt",
    accessorFn: (row) => Date.parse(row.signedAt),
    header: ({ column }) => <DataGridColumnHeader title="Firma" column={column} />,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDiaBogota(row.original.signedAt)}</span>,
    size: 130,
    enableHiding: false,
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    header: ({ column }) => <DataGridColumnHeader title="Estado" column={column} />,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.status}</span>,
    size: 130,
    enableHiding: false,
  },
  {
    id: "process",
    header: () => <span className="sr-only">Proceso</span>,
    cell: ({ row }) => {
      const url = safeHttpUrl(row.original.processUrl);
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir proceso en SECOP: ${row.original.entity}`}
          className="inline-flex items-center gap-1 text-sm whitespace-nowrap underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Abrir proceso
          <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">Sin enlace</span>
      );
    },
    size: 150,
    enableSorting: false,
    enableHiding: false,
  },
];

/** Size and profitability of each competitor next to the company, and the public contracts they won. */
export function CompetidoresView() {
  const company = useCompany();
  const competitors = useMemo(() => withNitCompetitors(company), [company]);
  const names = useMemo(() => namesByNit(company), [company]);
  const columns = useMemo(() => buildColumns(names), [names]);
  const finances = useSupersociedades();
  const secop = useSecop();

  const latest = useMemo(() => latestFinancialsByNit(finances.data?.financials ?? []), [finances.data]);
  const rows = useMemo(
    () => (secop.data?.contracts ?? []).filter((contract) => competitors.some((competitor) => competitor.nit === contract.supplierNit)),
    [secop.data, competitors],
  );
  const companies = [
    ...(company.nit ? [{ name: company.name, nit: company.nit, isCompany: true }] : []),
    ...competitors.map((competitor) => ({ ...competitor, isCompany: false })),
  ];
  useRegisterPageContext(contractsContext("/competidores", "Competidores", rows, [{ label: "Competidores", value: competitors.map((c) => c.name).join(", ") }]));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro
        title="Competidores"
        description="Qué tan grande y rentable es cada competidor frente a la empresa, y qué contratos públicos firmó en los últimos 12 meses."
      />

      <div className="flex flex-col gap-2">
        {finances.view.status === "error" && (
          <ErrorState source="Supersociedades" message={finances.view.errorMessage ?? "Error desconocido."} kind={finances.view.errorKind} onRetry={finances.view.retry} />
        )}
        {secop.view.status === "error" && (
          <ErrorState source="SECOP II" message={secop.view.errorMessage ?? "Error desconocido."} kind={secop.view.errorKind} onRetry={secop.view.retry} />
        )}
        {finances.view.isStale && <StaleNotice source="Supersociedades" updatedAt={finances.view.updatedAt} />}
        {secop.view.isStale && <StaleNotice source="SECOP II" updatedAt={secop.view.updatedAt} />}
      </div>

      {finances.view.status === "pending" ? (
        <div role="status" aria-label="Consultando Supersociedades" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
          {companies.map((company) => (
            <Skeleton key={company.nit} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : finances.view.status === "ready" ? (
        finances.data?.financials.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
            {companies.map((company) => (
              <CompanyCard
                key={company.nit}
                name={company.name}
                nit={company.nit}
                isCompany={company.isCompany}
                financials={latest.get(company.nit)}
                fetchedAt={finances.view.updatedAt}
              />
            ))}
          </div>
        ) : (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyTitle>Supersociedades no devolvió cifras para estas empresas</EmptyTitle>
              <EmptyDescription>Puede ser un fallo temporal de datos.gov.co. Intenta de nuevo más tarde.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : null}

      {secop.view.status === "pending" ? (
        <Skeleton role="status" aria-label="Consultando SECOP II en datos.gov.co" className="h-80 rounded-xl" />
      ) : secop.view.status === "ready" ? (
        <DataTableCard
          title="Contratos de los competidores"
          icon={<UsersIcon aria-hidden="true" />}
          description="Contratos públicos firmados en los últimos 12 meses por los competidores configurados."
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          initialSort={[{ id: "signedAt", desc: true }]}
          countLabel="contratos"
          emptyMessage={
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyTitle>No hay contratos de competidores en los últimos 12 meses</EmptyTitle>
                <EmptyDescription>SECOP II no devolvió contratos firmados por los NIT de los competidores.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          footer={
            <ProvenanceNote attribution={SOURCES.secop.attribution} license={SOURCES.secop.license} fetchedAt={secop.view.updatedAt} />
          }
        />
      ) : null}
    </div>
  );
}
