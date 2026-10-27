import { EventItem } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { Badge } from "@/components/reui/badge";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import type { CompanyFinancials } from "@/core/domain/company";
import type { PublicContract } from "@/core/domain/contract";
import { netMarginPct } from "@/core/rules/financials";
import { formatPct1 } from "@/features/macro/format";
import { formatCop } from "@/lib/money";

const amount = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  name: string;
  nit: string;
  isCompany: boolean;
  /** Latest cutoff year of the company, or undefined when the source has no figures for it. */
  financials?: CompanyFinancials;
  /** Public contracts this company signed. */
  contracts: PublicContract[];
  /** True once SECOP answered, so an empty list can say "none" instead of "loading". */
  contractsReady: boolean;
  fetchedAt?: number;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

/** Size and profitability of one company for its latest cutoff year, and the public contracts it signed. */
export function CompetitorDetail({ name, nit, isCompany, financials, contracts, contractsReady, fetchedAt }: Props) {
  const margin = financials ? netMarginPct(financials) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{name}</h2>
          <Badge variant={isCompany ? "primary-light" : "outline"}>{isCompany ? "Empresa" : "Competidor"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          NIT {nit}
          {financials?.city ? `, ${financials.city}` : ""}
        </p>
      </header>

      {financials ? (
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Ingresos operacionales" value={amount.format(financials.revenue)} />
            <Figure label="Ganancia (pérdida) neta" value={amount.format(financials.netIncome)} />
          </div>
          <p className="text-xs text-muted-foreground">{margin === null ? "Margen neto: sin dato." : `Margen neto: ${formatPct1(margin)}.`}</p>
          <p className="text-xs text-muted-foreground">
            Corte {financials.cutoffYear}. Cifras: {financials.unitNote}.
          </p>
          <ProvenanceNote attribution={financials.provenance.attribution} license={financials.provenance.license} fetchedAt={fetchedAt} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Supersociedades no tiene cifras de esta empresa.</p>
      )}

      {contractsReady && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Contratos públicos de los últimos 12 meses</h3>
          {contracts.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">SECOP II no devolvió contratos de esta empresa.</p>
          ) : (
            <EventList
              flat
              label="Contratos"
              items={contracts.map((contract) => ({ contract, at: contract.signedAt }))}
              getKey={({ contract }) => contract.id}
              renderItem={({ contract }) => (
                <EventItem
                  title={contract.entity}
                  at={contract.signedAt}
                  source="SECOP II"
                  topic={formatCop(contract.value)}
                  detail={`Estado: ${contract.status}`}
                  href={contract.processUrl}
                />
              )}
            />
          )}
        </section>
      )}
    </div>
  );
}
