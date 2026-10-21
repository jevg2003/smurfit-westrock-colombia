import type { Observation } from "@/core/domain/observation";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { xmHourlyResponseSchema } from "./schema";

export const XM_HOURLY_URL = "https://servapibi.xm.com.co/hourly";
const LICENSE = "Datos públicos de XM (API pública, sin licencia abierta declarada)";
const ATTRIBUTION = "XM S.A. E.S.P. – Precio de bolsa nacional (API pública)";
const UNIT = "COP/kWh";
/** The API refuses hourly queries wider than 31 days. */
const MAX_DAYS = 31;
const DAY_MS = 86_400_000;
const HOURS = Array.from({ length: 24 }, (_, index) => `Hour${String(index + 1).padStart(2, "0")}`);

export interface XmQuery {
  /** Window length in days, ending yesterday (UTC). Default and maximum: 31. */
  days?: number;
}

export interface XmAdapterOptions {
  fetcher?: Fetcher;
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Request body for the national spot price; the window ends yesterday because today is incomplete. */
export function buildXmBody(now: Date, days: number = MAX_DAYS) {
  const span = Math.min(Math.max(Math.trunc(days), 1), MAX_DAYS);
  const end = now.getTime() - DAY_MS;
  return { MetricId: "PrecBolsNaci", Entity: "Sistema", StartDate: isoDate(end - (span - 1) * DAY_MS), EndDate: isoDate(end) };
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "xm", kind, message, ...(status ? { status } : {}) } }) as const;

/** Daily mean of the 24 hourly prices, or null when the day is incomplete or not numeric. */
function dailyMean(values: Record<string, string>): number | null {
  const hourly = HOURS.map((hour) => (values[hour] === undefined ? Number.NaN : Number(values[hour])));
  if (hourly.some((value) => !Number.isFinite(value))) return null;
  return hourly.reduce((sum, value) => sum + value, 0) / hourly.length;
}

export function createXmAdapter({ fetcher = createFetcher() }: XmAdapterOptions = {}): SourceAdapter<XmQuery, Observation[]> {
  return {
    sourceId: "xm",
    async fetch(query, { signal, now }): Promise<Result<{ data: Observation[]; provenance: Provenance }>> {
      let response: Response;
      try {
        response = await fetcher(XM_HOURLY_URL, {
          method: "POST",
          signal,
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(buildXmBody(now, query.days)),
        });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "XM no respondió a tiempo." : "No se pudo conectar con XM.");
      }

      if (response.status === 429) return failure("rate_limited", "XM limitó las consultas.", 429);
      if (!response.ok) return failure("network", `XM respondió con el estado ${response.status}.`, response.status);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return failure("schema", "La respuesta de XM no es JSON válido.");
      }

      const parsed = xmHourlyResponseSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return failure("schema", `La respuesta de XM cambió de forma (${issue.path.join(".") || "raíz"}: ${issue.message}).`);
      }

      const provenance: Provenance = { sourceId: "xm", url: XM_HOURLY_URL, fetchedAt: now.toISOString(), license: LICENSE, attribution: ATTRIBUTION };
      const data = parsed.data.Items.flatMap((item): Observation[] => {
        const entity = item.HourlyEntities.find((candidate) => candidate.Id === "Sistema");
        const value = entity ? dailyMean(entity.Values) : null;
        return value === null ? [] : [{ indicatorId: "precio_bolsa_energia", date: item.Date, value, unit: UNIT, provenance }];
      }).sort((a, b) => a.date.localeCompare(b.date));
      if (data.length === 0) return failure("empty", "XM no devolvió días completos para el precio de bolsa.");

      return { ok: true, value: { data, provenance } };
    },
  };
}
