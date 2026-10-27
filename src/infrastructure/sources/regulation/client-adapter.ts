import type { Provenance } from "@/core/domain/provenance";
import type { RegulationItem } from "@/core/domain/regulation";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { safeHttpUrl } from "@/lib/safe-url";
import { regulationResponseSchema } from "./schema";
import { DECREES_ATTRIBUTION, DECREES_DATASET_URL, DECREES_LICENSE, type RegulationApiItem } from "./types";

export const REGULATION_API_PATH = "/api/regulacion";
const MINAMBIENTE_LICENSE = "Solo titular, fecha y enlace (derechos del Ministerio)";
const MINAMBIENTE_ATTRIBUTION = "Ministerio de Ambiente y Desarrollo Sostenible";

export interface RegulationBlock {
  status: "ok" | "error" | "disabled";
  items: RegulationItem[];
  httpStatus?: number;
  message?: string;
}

/** The keywords of the active company that make a decree relevant. */
export interface RegulationQuery {
  terms: { include: readonly string[]; exclude: readonly string[] };
}

export interface RegulationFeedData {
  minambiente: RegulationBlock;
  presidencia: RegulationBlock;
}

export interface RegulationAdapterOptions {
  fetcher?: Fetcher;
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "minambiente", kind, message, ...(status ? { status } : {}) } }) as const;

function toItem(item: RegulationApiItem, fetchedAt: string): RegulationItem[] {
  const url = safeHttpUrl(item.url);
  if (!url) return [];
  const provenance: Provenance =
    item.kind === "decree"
      ? { sourceId: "presidencia", url: DECREES_DATASET_URL, fetchedAt, license: DECREES_LICENSE, attribution: DECREES_ATTRIBUTION }
      : { sourceId: "minambiente", url, fetchedAt, license: MINAMBIENTE_LICENSE, attribution: MINAMBIENTE_ATTRIBUTION };
  return [{ id: item.id, kind: item.kind, title: item.title, ...(item.summary ? { summary: item.summary } : {}), url, publishedAt: item.publishedAt, provenance }];
}

/**
 * Reads our own `/api/regulacion` route (same origin). A source that failed on the server comes back
 * as an `error` block so the other one is still shown.
 */
export function createRegulationAdapter({
  fetcher = createFetcher(),
}: RegulationAdapterOptions = {}): SourceAdapter<RegulationQuery, RegulationFeedData> {
  return {
    sourceId: "minambiente",
    async fetch(query, { signal }): Promise<Result<{ data: RegulationFeedData; provenance: Provenance }>> {
      let response: Response;
      try {
        response = await fetcher(REGULATION_API_PATH, {
          method: "POST",
          body: JSON.stringify({ keywords: query.terms }),
          signal,
          headers: { accept: "application/json", "content-type": "application/json" },
        });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "La regulación no respondió a tiempo." : "No se pudo conectar con la regulación.");
      }
      if (!response.ok) return failure("network", `La regulación respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de la regulación no es JSON válido.");
      }
      const parsed = regulationResponseSchema.safeParse(body);
      if (!parsed.success) return failure("schema", "La respuesta de la regulación cambió de forma.");

      const { minambiente, presidencia, fetchedAt } = parsed.data;
      if (minambiente.status === "disabled" && presidencia.status === "disabled") {
        return failure("disabled", "Las fuentes de regulación están desactivadas.");
      }
      const block = (source: typeof minambiente): RegulationBlock => ({
        status: source.status,
        items: source.items.flatMap((item) => toItem(item, fetchedAt)),
        ...(source.httpStatus ? { httpStatus: source.httpStatus } : {}),
        ...(source.message ? { message: source.message } : {}),
      });
      const provenance: Provenance = {
        sourceId: "minambiente",
        url: REGULATION_API_PATH,
        fetchedAt,
        license: MINAMBIENTE_LICENSE,
        attribution: MINAMBIENTE_ATTRIBUTION,
      };
      return { ok: true, value: { data: { minambiente: block(minambiente), presidencia: block(presidencia) }, provenance } };
    },
  };
}
