import type { PublicContract } from "@/core/domain/contract";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { bogotaDateKey, floatingToBogotaIso } from "@/core/time/bogota";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { secopContractsResponseSchema, type SecopContractRow } from "./schema";

export const SECOP_DATASET_URL = "https://www.datos.gov.co/resource/jbjy-vk9h.json";
const SECOP_LICENSE = "CC BY-SA 4.0";
const SECOP_ATTRIBUTION = "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co";
const DEFAULT_LIMIT = 200;
const NIT_PATTERN = /^\d{5,12}$/;

export interface SecopQuery {
  /** Supplier NITs (digits only, no check digit): the company plus its competitors. */
  nits: readonly string[];
}

export interface SecopAdapterOptions {
  fetcher?: Fetcher;
  limit?: number;
}

/**
 * Query by exact supplier NIT and signing date. Never uses LIKE on text columns: the portal
 * takes 14-48 s for those, while exact filters answer in under 5 s.
 */
export function buildSecopUrl(query: SecopQuery, now: Date, limit: number = DEFAULT_LIMIT): string {
  const since = `${twelveMonthsBefore(bogotaDateKey(now))}T00:00:00.000`;
  const where = `documento_proveedor in(${query.nits.map((nit) => `'${nit}'`).join(",")}) AND fecha_de_firma>'${since}'`;
  const params = [
    `$where=${encodeURIComponent(where)}`,
    `$order=${encodeURIComponent("fecha_de_firma DESC")}`,
    `$limit=${limit}`,
  ];
  return `${SECOP_DATASET_URL}?${params.join("&")}`;
}

/** Same calendar day one year earlier (29 February falls back to 28 February). */
function twelveMonthsBefore(dateKey: string): string {
  const monthDay = dateKey.slice(5) === "02-29" ? "02-28" : dateKey.slice(5);
  return `${Number(dateKey.slice(0, 4)) - 1}-${monthDay}`;
}

function recordUrl(contractId: string): string {
  return `${SECOP_DATASET_URL}?id_contrato=${encodeURIComponent(contractId)}`;
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toContract(row: SecopContractRow, fetchedAt: string): PublicContract | null {
  const signedAt = floatingToBogotaIso(row.fecha_de_firma);
  const value = Number(row.valor_del_contrato);
  if (!signedAt || !Number.isFinite(value)) return null;
  const endsAt = row.fecha_de_fin_del_contrato ? floatingToBogotaIso(row.fecha_de_fin_del_contrato) : null;
  const processUrl = safeHttpUrl(row.urlproceso?.url);

  const provenance: Provenance = {
    sourceId: "secop",
    url: recordUrl(row.id_contrato),
    fetchedAt,
    license: SECOP_LICENSE,
    attribution: SECOP_ATTRIBUTION,
  };

  return {
    id: row.id_contrato,
    entity: row.nombre_entidad,
    ...(row.departamento ? { department: row.departamento } : {}),
    supplierNit: row.documento_proveedor,
    supplierName: row.proveedor_adjudicado,
    value,
    signedAt,
    ...(endsAt ? { endsAt } : {}),
    status: row.estado_contrato,
    ...(processUrl ? { processUrl } : {}),
    provenance,
  };
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "secop", kind, message, ...(status ? { status } : {}) } }) as const;

export function createSecopContractsAdapter({
  fetcher = createFetcher(),
  limit = DEFAULT_LIMIT,
}: SecopAdapterOptions = {}): SourceAdapter<SecopQuery, PublicContract[]> {
  return {
    sourceId: "secop",
    async fetch(query, { signal, now }): Promise<Result<{ data: PublicContract[]; provenance: Provenance }>> {
      if (query.nits.length === 0 || !query.nits.every((nit) => NIT_PATTERN.test(nit))) {
        return failure("unknown", "Los NIT de la consulta no son válidos.");
      }

      const url = buildSecopUrl(query, now, limit);
      let response: Response;
      try {
        response = await fetcher(url, { signal, headers: { accept: "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "SECOP II no respondió a tiempo." : "No se pudo conectar con SECOP II.");
      }

      if (response.status === 429) return failure("rate_limited", "SECOP II limitó las consultas.", 429);
      if (!response.ok) return failure("network", `SECOP II respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de SECOP II no es JSON válido.");
      }

      const parsed = secopContractsResponseSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return failure("schema", `La respuesta de SECOP II cambió de forma (${issue.path.join(".") || "raíz"}: ${issue.message}).`);
      }

      const fetchedAt = now.toISOString();
      const data = parsed.data.flatMap((row) => {
        const contract = toContract(row, fetchedAt);
        return contract ? [contract] : [];
      });
      if (data.length === 0) return failure("empty", "SECOP II no devolvió contratos para estos NIT.");

      return {
        ok: true,
        value: {
          data,
          provenance: { sourceId: "secop", url, fetchedAt, license: SECOP_LICENSE, attribution: SECOP_ATTRIBUTION },
        },
      };
    },
  };
}
