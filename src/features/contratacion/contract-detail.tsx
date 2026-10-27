import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { ProvenanceNote } from "@/components/shell/provenance-note";
import type { PublicContract } from "@/core/domain/contract";
import type { ContractExpiry, ExpiryLevel } from "@/core/rules/contract-expiry";
import { formatDiaBogota } from "@/lib/date";
import { formatCop } from "@/lib/money";
import { safeHttpUrl } from "@/lib/safe-url";

export const EXPIRY_BADGE: Record<ExpiryLevel, "destructive-light" | "warning-light" | "success-light" | "outline"> = {
  alert: "destructive-light",
  watch: "warning-light",
  ok: "success-light",
  neutral: "outline",
};

interface Props {
  contract: PublicContract;
  expiry: ContractExpiry;
  fetchedAt?: number;
}

/** The facts of one public contract, with the link to its process and where the data comes from. */
export function ContractDetail({ contract, expiry, fetchedAt }: Props) {
  const url = safeHttpUrl(contract.processUrl);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Badge variant={EXPIRY_BADGE[expiry.level]} className="self-start">
          {expiry.label}
        </Badge>
        <h2 className="text-base leading-snug font-semibold">{contract.entity}</h2>
        <p className="font-mono text-xs text-muted-foreground">{contract.id}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Valor</dt>
        <dd className="tabular-nums">{formatCop(contract.value)}</dd>
        <dt className="text-muted-foreground">Firma</dt>
        <dd>{formatDiaBogota(contract.signedAt)}</dd>
        <dt className="text-muted-foreground">Fin</dt>
        <dd>{contract.endsAt ? formatDiaBogota(contract.endsAt) : "Sin fecha"}</dd>
        <dt className="text-muted-foreground">Estado</dt>
        <dd>{contract.status}</dd>
        <dt className="text-muted-foreground">Proveedor</dt>
        <dd className="min-w-0 break-words">{contract.supplierName}</dd>
      </dl>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir proceso en SECOP: ${contract.entity}`}
          className="inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Abrir proceso
          <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">Este contrato no trae enlace al proceso.</p>
      )}

      <ProvenanceNote attribution={contract.provenance.attribution} license={contract.provenance.license} fetchedAt={fetchedAt} />
    </div>
  );
}
