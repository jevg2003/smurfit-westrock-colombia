import { z } from "zod";
import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { NEWS_CACHE_CONTROL } from "../rss/handler";
import { loadRegulation } from "./service";

const REQUEST_TIMEOUT_MS = 12_000;

/** The only input a client can send: which of the two sources it wants. Any other parameter is rejected. */
export const regulationQuerySchema = z.strictObject({
  source: z.enum(["minambiente", "presidencia"]).optional(),
});

export interface RegulationHandlerDeps {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  flags?: () => SourceFlags;
}

export async function handleRegulationRequest(
  request: Request,
  { fetchImpl, now = () => new Date(), flags = readFlags }: RegulationHandlerDeps = {},
): Promise<Response> {
  const query = regulationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return Response.json({ error: "Parámetros no válidos. Solo se acepta `source` (minambiente o presidencia)." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const fetcher = createFetcher({ fetchImpl, timeoutMs: REQUEST_TIMEOUT_MS, retryDelayMs: 0 });
  const body = await loadRegulation({ fetcher, now: now(), flags: flags(), source: query.data.source });
  return Response.json(body, { headers: { "Cache-Control": NEWS_CACHE_CONTROL } });
}
