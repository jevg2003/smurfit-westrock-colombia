import { z } from "zod";
import { regulationTermsSchema } from "@/core/company/context";
import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { NEWS_CACHE_CONTROL } from "../rss/handler";
import { loadRegulation } from "./service";

const REQUEST_TIMEOUT_MS = 12_000;

/** The request body is a short keyword list; anything larger is not ours. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * The only inputs a client can send: which of the two sources it wants and the regulation keywords of its
 * company (the profile lives in the browser). Any other field is rejected.
 */
export const regulationRequestSchema = z.strictObject({
  source: z.enum(["minambiente", "presidencia"]).optional(),
  keywords: regulationTermsSchema,
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
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json({ error: "La solicitud es demasiado grande." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "La solicitud no es válida." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const query = regulationRequestSchema.safeParse(json);
  if (!query.success) {
    return Response.json({ error: "Parámetros no válidos. Solo se acepta `source` (minambiente o presidencia) y `keywords`." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const fetcher = createFetcher({ fetchImpl, timeoutMs: REQUEST_TIMEOUT_MS, retryDelayMs: 0 });
  const body = await loadRegulation({ fetcher, now: now(), flags: flags(), source: query.data.source, terms: query.data.keywords });
  return Response.json(body, { headers: { "Cache-Control": NEWS_CACHE_CONTROL } });
}
