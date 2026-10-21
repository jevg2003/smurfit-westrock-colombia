import { z } from "zod";
import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";

export const ENERGY_API_PATH = "/api/energia";

const responseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    unit: z.string(),
    days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), value: z.number() })),
    provenance: z.object({ url: z.string(), license: z.string(), attribution: z.string(), fetchedAt: z.string() }),
  }),
  z.object({ status: z.literal("disabled") }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

export interface EnergyClientQuery {
  /** Window length in days (1 to 60). Default: the server default. */
  days?: number;
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "xm", kind, message, ...(status ? { status } : {}) } }) as const;

/** Reads our own `/api/energia` route (same origin): XM itself sends no CORS headers. */
export function createEnergyClientAdapter({ fetcher = createFetcher() }: { fetcher?: Fetcher } = {}): SourceAdapter<
  EnergyClientQuery,
  Observation[]
> {
  return {
    sourceId: "xm",
    async fetch(query, { signal }): Promise<Result<{ data: Observation[]; provenance: Provenance }>> {
      const url = query.days ? `${ENERGY_API_PATH}?days=${query.days}` : ENERGY_API_PATH;
      let response: Response;
      try {
        response = await fetcher(url, { signal, headers: { accept: "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "XM no respondió a tiempo." : "No se pudo conectar con XM.");
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de la energía no es JSON válido.");
      }
      const parsed = responseSchema.safeParse(body);
      if (!parsed.success) return failure(response.ok ? "schema" : "network", `La energía respondió con el estado ${response.status}.`, response.status);

      const data = parsed.data;
      if (data.status === "disabled") return failure("disabled", "La fuente de energía está desactivada.");
      if (data.status === "error") return failure("network", data.message, response.status);

      const provenance: Provenance = { sourceId: "xm", ...data.provenance };
      const observations = data.days.map((day): Observation => ({
        indicatorId: "precio_bolsa_energia",
        date: day.date,
        value: day.value,
        unit: data.unit,
        provenance,
      }));
      if (observations.length === 0) return failure("empty", "XM no devolvió días completos para el precio de bolsa.");
      return { ok: true, value: { data: observations, provenance } };
    },
  };
}
