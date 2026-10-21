import { z } from "zod";
import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { createXmAdapter, XM_HOURLY_URL } from "./adapter";

/** The upstream data moves once a day: six hours of shared cache is plenty. */
export const ENERGY_CACHE_CONTROL = "public, s-maxage=21600, stale-while-revalidate=21600";
export const ENERGY_REVALIDATE_SECONDS = 21_600;
export const ENERGY_MAX_DAYS = 60;
export const ENERGY_DEFAULT_DAYS = 30;
/** XM answers at most 31 days per hourly query, so a longer window is read in chunks. */
const CHUNK_DAYS = 31;
const DAY_MS = 86_400_000;
const REQUEST_TIMEOUT_MS = 15_000;

/** The only input a client can send: how many days. Anything else is rejected. */
export const energyQuerySchema = z.strictObject({
  days: z.coerce.number().int().min(1).max(ENERGY_MAX_DAYS).optional(),
});

export interface EnergyDay {
  date: string;
  /** Mean of the 24 hourly spot prices, COP/kWh. */
  value: number;
}

export type EnergyResponse =
  | { status: "ok"; unit: string; days: EnergyDay[]; provenance: { url: string; license: string; attribution: string; fetchedAt: string } }
  | { status: "disabled" }
  | { status: "error"; message: string };

export interface EnergyHandlerDeps {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  flags?: () => SourceFlags;
}

const headers = (cacheControl: string) => ({ "Cache-Control": cacheControl });

export async function handleEnergyRequest(
  request: Request,
  { fetchImpl, now = () => new Date(), flags = readFlags }: EnergyHandlerDeps = {},
): Promise<Response> {
  const query = energyQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return Response.json(
      { error: `Parámetros no válidos. Solo se acepta \`days\` (entero de 1 a ${ENERGY_MAX_DAYS}).` },
      { status: 400, headers: headers("no-store") },
    );
  }
  if (!flags().xm) return Response.json({ status: "disabled" } satisfies EnergyResponse, { headers: headers(ENERGY_CACHE_CONTROL) });

  const days = query.data.days ?? ENERGY_DEFAULT_DAYS;
  const adapter = createXmAdapter({ fetcher: createFetcher({ fetchImpl, timeoutMs: REQUEST_TIMEOUT_MS, retryDelayMs: 0 }) });
  const at = now();
  // The adapter's window ends the day before `now`, so the older chunk simply uses an earlier `now`.
  const chunks = Array.from({ length: Math.ceil(days / CHUNK_DAYS) }, (_, index) => ({
    days: Math.min(CHUNK_DAYS, days - index * CHUNK_DAYS),
    now: new Date(at.getTime() - index * CHUNK_DAYS * DAY_MS),
  }));
  const results = await Promise.all(chunks.map((chunk) => adapter.fetch({ days: chunk.days }, { now: chunk.now })));

  const ok = results.flatMap((result) => (result.ok ? [result.value] : []));
  const latest = results[0];
  // The most recent chunk is the one that matters; an older chunk failing only shortens the series.
  if (!latest.ok || ok.length === 0) {
    const message = latest.ok ? "XM no devolvió datos." : latest.error.message;
    return Response.json({ status: "error", message } satisfies EnergyResponse, { status: 502, headers: headers("no-store") });
  }

  const byDate = new Map<string, EnergyDay>();
  for (const value of ok) for (const obs of value.data) byDate.set(obs.date, { date: obs.date, value: obs.value });
  const first = latest.value.provenance;
  const body: EnergyResponse = {
    status: "ok",
    unit: latest.value.data[0]?.unit ?? "COP/kWh",
    days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    provenance: { url: XM_HOURLY_URL, license: first.license, attribution: first.attribution, fetchedAt: at.toISOString() },
  };
  return Response.json(body, { headers: headers(ENERGY_CACHE_CONTROL) });
}
