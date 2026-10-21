import { Badge } from "@/components/reui/badge";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { CompanyFinancials } from "@/core/domain/company";
import { netMarginPct } from "@/core/rules/financials";
import { formatPct1 } from "@/features/macro/format";

const amount = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  name: string;
  nit: string;
  isCompany: boolean;
  /** Latest cutoff year of the company, or undefined when the source has no figures for it. */
  financials?: CompanyFinancials;
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

/** Size and profitability of one company for its latest cutoff year, with the unit caveat of the source. */
export function CompanyCard({ name, nit, isCompany, financials, fetchedAt }: Props) {
  const margin = financials ? netMarginPct(financials) : null;

  return (
    <Card className="h-full min-w-0 gap-0 py-0">
      <CardContent className="flex flex-1 flex-col gap-3 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-sm font-medium">{name}</h2>
            <Badge variant={isCompany ? "primary-light" : "outline"} size="sm">
              {isCompany ? "Empresa" : "Competidor"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            NIT {nit}
            {financials?.city ? ` · ${financials.city}` : ""}
          </span>
        </div>

        {financials ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Figure label="Ingresos operacionales" value={amount.format(financials.revenue)} />
              <Figure label="Ganancia (pérdida) neta" value={amount.format(financials.netIncome)} />
            </div>
            <p className="text-xs text-muted-foreground">
              {margin === null ? "Margen neto: sin dato." : `Margen neto: ${formatPct1(margin)}.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Corte {financials.cutoffYear}. Cifras: {financials.unitNote}.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Supersociedades no tiene cifras de esta empresa.</p>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 px-4 py-2">
        {financials ? (
          <ProvenanceNote
            attribution={financials.provenance.attribution}
            license={financials.provenance.license}
            fetchedAt={fetchedAt}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sin fuente para mostrar.</span>
        )}
      </CardFooter>
    </Card>
  );
}
