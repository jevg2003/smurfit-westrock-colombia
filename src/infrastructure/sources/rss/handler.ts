import { z } from "zod";
import { termGroupSchema } from "@/core/company/context";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { NEWS_SOURCE_IDS } from "./feeds";
import { loadNews } from "./service";

/**
 * The answer depends on the company that asks and travels in a POST, so the browser and CDNs never keep it.
 * The upstream feeds keep their 30 minute cache in the Next fetch cache (see the route).
 */
export const NEWS_CACHE_CONTROL = "private, no-store";

/** Per-feed timeout. El Colombiano's feed measured up to 14 s on a slow call, so it can time out. */
const FEED_TIMEOUT_MS = 12_000;

/** The request body is a few KB of term groups; anything larger is not ours. */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * The only inputs a client can send: an optional feed id from the closed list, a limit and the term groups of
 * its company (the profile lives in the browser). Strict on purpose: any other field (for example `url`) is rejected.
 */
export const newsRequestSchema = z.strictObject({
  feed: z.enum(NEWS_SOURCE_IDS).optional(),
  limit: z.number().int().min(1).max(300).default(150),
  termGroups: z.array(termGroupSchema).min(1).max(8),
});

export interface NewsHandlerDeps {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  flags?: () => SourceFlags;
}

const badRequest = (message: string) =>
  Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });

export async function handleNewsRequest(
  request: Request,
  { fetchImpl, now = () => new Date(), flags = readFlags }: NewsHandlerDeps = {},
): Promise<Response> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return Response.json({ error: "La solicitud es demasiado grande." }, { status: 413, headers: { "Cache-Control": "no-store" } });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return badRequest("La solicitud no es válida.");
  }
  const query = newsRequestSchema.safeParse(json);
  if (!query.success) return badRequest("Parámetros no válidos. Solo se acepta `feed` (de la lista), `limit` (1 a 300) y `termGroups`.");

  const fetcher = createFetcher({ fetchImpl, timeoutMs: FEED_TIMEOUT_MS, retryDelayMs: 0 });
  const body = await loadNews({ fetcher, now: now(), flags: flags(), feedId: query.data.feed, limit: query.data.limit, termGroups: query.data.termGroups });
  return Response.json(body, { headers: { "Cache-Control": NEWS_CACHE_CONTROL } });
}
