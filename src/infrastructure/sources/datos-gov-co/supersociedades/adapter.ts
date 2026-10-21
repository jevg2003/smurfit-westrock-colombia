import type { CompanyFinancials } from "@/core/domain/company";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { supersociedadesResponseSchema, type SupersociedadesRow } from "./schema";

export const SUPERSOCIEDADES_DATASET_URL = "https://www.datos.gov.co/resource/6cat-2gcs.json";
const LICENSE = "CC BY-SA 4.0";
const ATTRIBUTION = "Superintendencia de Sociedades vía datos.gov.co";
/**
 * The columns carry no unit. The dataset description says all figures are in "billones de pesos",
 * so that is shown as a hint, never as a declared unit.
 */
const UNIT_NOTE = "unidad no declarada por la fuente (la descripción del dataset indica billones de pesos)";
const DEFAULT_LIMIT = 100;
const NIT_PATTERN = /^\d{5,12}$/;
const AMOUNT_PATTERN = /^(-?)\s*\$?\s*(-?)\s*(\d+(?:\.\d+)?)$/;

export interface SupersociedadesQuery {
  /** NITs (digits only, no check digit): the company plus its competitors. */
  nits: readonly string[];
}

export interface SupersociedadesAdapterOptions {
  fetcher?: Fetcher;
  limit?: number;
}

/**
 * Query by exact NIT (a number column, so the values go unquoted). Never LIKE: it is the slow path
 * on this portal. The dataset holds five cutoff years per company, newest first.
 */
export function buildSupersociedadesUrl(nits: readonly string[], limit: number = DEFAULT_LIMIT): string {
  const params = [
    `$where=${encodeURIComponent(`nit in(${nits.join(",")})`)}`,
    `$order=${encodeURIComponent("a_o_de_corte DESC")}`,
    `$limit=${limit}`,
  ];
  return `${SUPERSOCIEDADES_DATASET_URL}?${params.join("&")}`;
}

/** Reads text such as "$ 1.91" or "$0.57". Null when it is not a plain decimal amount. */
export function parseAmount(text: string): number | null {
  const match = AMOUNT_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, signBefore, signAfter, digits] = match;
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return signBefore || signAfter ? -value : value;
}

function wholeNumber(text: string): number | null {
  const value = Number(text);
  return Number.isInteger(value) ? value : null;
}

function toFinancials(row: SupersociedadesRow, provenance: Provenance): CompanyFinancials | null {
  const nit = wholeNumber(row.nit);
  const cutoffYear = wholeNumber(row.a_o_de_corte);
  const revenue = parseAmount(row.ingresos_operacionales);
  const netIncome = parseAmount(row.ganancia_p_rdida);
  if (nit === null || cutoffYear === null || revenue === null || netIncome === null) return null;

  const totalAssets = row.total_activos ? parseAmount(row.total_activos) : null;
  const ciiu = row.ciiu ? wholeNumber(row.ciiu) : null;
  return {
    nit: String(nit),
    name: row.raz_n_social,
    ...(row.ciudad_domicilio ? { city: row.ciudad_domicilio } : {}),
    ...(ciiu !== null ? { ciiu: String(ciiu) } : {}),
    cutoffYear,
    revenue,
    netIncome,
    ...(totalAssets !== null ? { totalAssets } : {}),
    unitNote: UNIT_NOTE,
    provenance,
  };
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "supersociedades", kind, message, ...(status ? { status } : {}) } }) as const;

export function createSupersociedadesAdapter({
  fetcher = createFetcher(),
  limit = DEFAULT_LIMIT,
}: SupersociedadesAdapterOptions = {}): SourceAdapter<SupersociedadesQuery, CompanyFinancials[]> {
  return {
    sourceId: "supersociedades",
    async fetch(query, { signal, now }): Promise<Result<{ data: CompanyFinancials[]; provenance: Provenance }>> {
      if (query.nits.length === 0 || !query.nits.every((nit) => NIT_PATTERN.test(nit))) {
        return failure("unknown", "Los NIT de la consulta no son válidos.");
      }

      const url = buildSupersociedadesUrl(query.nits, limit);
      let response: Response;
      try {
        response = await fetcher(url, { signal, headers: { accept: "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "Supersociedades no respondió a tiempo." : "No se pudo conectar con Supersociedades.");
      }

      if (response.status === 429) return failure("rate_limited", "datos.gov.co limitó las consultas.", 429);
      if (!response.ok) return failure("network", `Supersociedades respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de Supersociedades no es JSON válido.");
      }

      const parsed = supersociedadesResponseSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return failure("schema", `La respuesta de Supersociedades cambió de forma (${issue.path.join(".") || "raíz"}: ${issue.message}).`);
      }

      const provenance: Provenance = {
        sourceId: "supersociedades",
        url,
        fetchedAt: now.toISOString(),
        license: LICENSE,
        attribution: ATTRIBUTION,
      };
      const data = parsed.data.flatMap((row) => {
        const financials = toFinancials(row, provenance);
        return financials ? [financials] : [];
      });
      if (data.length === 0) return failure("empty", "Supersociedades no devolvió cifras para estos NIT.");

      return { ok: true, value: { data, provenance } };
    },
  };
}
