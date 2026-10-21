import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { bogotaDateKey } from "@/core/time/bogota";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { exportsResponseSchema } from "./schema";

export const EXPORTS_DATASET_URL = "https://www.datos.gov.co/resource/vwqt-xc3z.json";
const LICENSE = "CC BY-SA 4.0";
const ATTRIBUTION = "Ministerio de Comercio, Industria y Turismo - MinCIT vía datos.gov.co";
const UNIT = "millones de USD (unidad no declarada por la fuente)";
const YEARS_BACK = 10;

export interface ExportsAdapterOptions {
  fetcher?: Fetcher;
}

/**
 * Quarterly national non-mining-energy exports for the last ten years. The dataset has one row per
 * quarter already, so only `$select`, `$where` on the date and `$order` are needed; never LIKE.
 */
export function buildExportsUrl(now: Date): string {
  const since = `${Number(bogotaDateKey(now).slice(0, 4)) - YEARS_BACK}-01-01T00:00:00.000`;
  const params = [
    `$select=${encodeURIComponent("fecha,fecha_de_corte,valor_exportaciones_nme")}`,
    `$where=${encodeURIComponent(`fecha>'${since}'`)}`,
    `$order=${encodeURIComponent("fecha DESC")}`,
    "$limit=120",
  ];
  return `${EXPORTS_DATASET_URL}?${params.join("&")}`;
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "exports", kind, message, ...(status ? { status } : {}) } }) as const;

export function createExportsAdapter({
  fetcher = createFetcher(),
}: ExportsAdapterOptions = {}): SourceAdapter<Record<string, never>, Observation[]> {
  return {
    sourceId: "exports",
    async fetch(_query, { signal, now }): Promise<Result<{ data: Observation[]; provenance: Provenance }>> {
      const url = buildExportsUrl(now);
      let response: Response;
      try {
        response = await fetcher(url, { signal, headers: { accept: "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "Exportaciones (datos.gov.co) no respondió a tiempo." : "No se pudo conectar con datos.gov.co.");
      }

      if (response.status === 429) return failure("rate_limited", "datos.gov.co limitó las consultas.", 429);
      if (!response.ok) return failure("network", `datos.gov.co respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de exportaciones no es JSON válido.");
      }

      const parsed = exportsResponseSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return failure("schema", `La respuesta de exportaciones cambió de forma (${issue.path.join(".") || "raíz"}: ${issue.message}).`);
      }

      const fetchedAt = now.toISOString();
      const provenance: Provenance = { sourceId: "exports", url, fetchedAt, license: LICENSE, attribution: ATTRIBUTION };
      const data = parsed.data
        .flatMap((row): Observation[] => {
          const value = Number(row.valor_exportaciones_nme);
          if (!Number.isFinite(value)) return [];
          return [{ indicatorId: "exportaciones", date: row.fecha.slice(0, 10), value, unit: UNIT, provenance }];
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      if (data.length === 0) return failure("empty", "Exportaciones no devolvió datos.");

      return { ok: true, value: { data, provenance } };
    },
  };
}
