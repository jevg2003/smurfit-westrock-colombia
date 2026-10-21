import { toCsv } from "@/core/format/csv";
import type { PublicContract } from "@/core/domain/contract";
import { bogotaDateKey } from "@/core/time/bogota";
import { contractExpiry, type ExpiryThresholds } from "@/core/rules/contract-expiry";

export const CONTRACTS_CSV_COLUMNS = [
  "id_contrato",
  "entidad",
  "proveedor",
  "nit",
  "valor_cop",
  "fecha_firma",
  "fecha_fin",
  "estado",
  "vencimiento",
  "enlace_proceso",
  "fuente",
  "licencia",
  "enlace_registro",
] as const;

export function contractsToCsv(contracts: readonly PublicContract[], now: Date, thresholds: ExpiryThresholds): string {
  return toCsv(
    CONTRACTS_CSV_COLUMNS,
    contracts.map((contract) => [
      contract.id,
      contract.entity,
      contract.supplierName,
      contract.supplierNit,
      contract.value,
      bogotaDateKey(contract.signedAt),
      contract.endsAt ? bogotaDateKey(contract.endsAt) : "",
      contract.status,
      contractExpiry(contract, now, thresholds).label,
      contract.processUrl ?? "",
      contract.provenance.attribution,
      contract.provenance.license,
      contract.provenance.url,
    ]),
    { neutralizeFormulas: true },
  );
}
