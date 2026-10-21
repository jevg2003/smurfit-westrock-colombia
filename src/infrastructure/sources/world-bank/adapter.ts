import type { IndicatorId, Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { worldBankResponseSchema } from "./schema";

export const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country/COL/indicator";
const LICENSE = "CC BY 4.0";
const ATTRIBUTION = "Banco Mundial – World Development Indicators";

export type WorldBankIndicator = Extract<IndicatorId, "pib" | "ipc_anual">;

export interface WorldBankQuery {
  indicator: WorldBankIndicator;
}

/** Annual real GDP growth (%) and annual consumer-price inflation (%). */
const INDICATOR_CODES: Record<WorldBankIndicator, string> = {
  pib: "NY.GDP.MKTP.KD.ZG",
  ipc_anual: "FP.CPI.TOTL.ZG",
};

export interface WorldBankAdapterOptions {
  fetcher?: Fetcher;
}

/** The whole series fits in one page (66 years, page size 200). */
export function buildWorldBankUrl(indicator: WorldBankIndicator): string {
  return `${WORLD_BANK_BASE_URL}/${INDICATOR_CODES[indicator]}?format=json&per_page=200`;
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "world-bank", kind, message, ...(status ? { status } : {}) } }) as const;

export function createWorldBankAdapter({
  fetcher = createFetcher(),
}: WorldBankAdapterOptions = {}): SourceAdapter<WorldBankQuery, Observation[]> {
  return {
    sourceId: "world-bank",
    async fetch(query, { signal, now }): Promise<Result<{ data: Observation[]; provenance: Provenance }>> {
      if (!(query.indicator in INDICATOR_CODES)) return failure("unknown", "El indicador pedido no es válido.");

      const url = buildWorldBankUrl(query.indicator);
      let response: Response;
      try {
        response = await fetcher(url, { signal, headers: { accept: "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "El Banco Mundial no respondió a tiempo." : "No se pudo conectar con el Banco Mundial.");
      }

      if (response.status === 429) return failure("rate_limited", "El Banco Mundial limitó las consultas.", 429);
      if (!response.ok) return failure("network", `El Banco Mundial respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta del Banco Mundial no es JSON válido.");
      }

      const parsed = worldBankResponseSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return failure("schema", `La respuesta del Banco Mundial cambió de forma (${issue.path.join(".") || "raíz"}: ${issue.message}).`);
      }

      const fetchedAt = now.toISOString();
      const provenance: Provenance = { sourceId: "world-bank", url, fetchedAt, license: LICENSE, attribution: ATTRIBUTION };
      const data = (parsed.data[1] ?? [])
        .flatMap((row): Observation[] =>
          row.value === null
            ? []
            : [{ indicatorId: query.indicator, date: row.date, value: row.value, unit: "%", provenance }],
        )
        .sort((a, b) => a.date.localeCompare(b.date));
      if (data.length === 0) return failure("empty", "El Banco Mundial no devolvió datos para este indicador.");

      return { ok: true, value: { data, provenance } };
    },
  };
}
