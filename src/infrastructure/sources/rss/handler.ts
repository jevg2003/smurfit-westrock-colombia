import { z } from "zod";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { readFlags, type SourceFlags } from "@/infrastructure/flags";
import { NEWS_FEED_IDS } from "./feeds";
import { loadNews } from "./service";

/** Media feeds are cached for 30 minutes (proposal §6.7); stale copies are served while revalidating. */
export const NEWS_CACHE_CONTROL = "public, s-maxage=1800, stale-while-revalidate=3600";

/** Per-feed timeout. El Colombiano's feed measured up to 14 s on a slow call, so it can time out. */
const FEED_TIMEOUT_MS = 12_000;

/**
 * The only inputs a client can send: an optional feed id from the closed list and a limit.
 * Strict on purpose: any other parameter (for example `url`) is rejected.
 */
export const newsQuerySchema = z.strictObject({
  feed: z.enum(NEWS_FEED_IDS).optional(),
  limit: z.coerce.number().int().min(1).max(300).default(150),
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
  const query = newsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return badRequest("Parámetros no válidos. Solo se acepta `feed` (de la lista) y `limit` (1 a 300).");

  const fetcher = createFetcher({ fetchImpl, timeoutMs: FEED_TIMEOUT_MS, retryDelayMs: 0 });
  const body = await loadNews({ fetcher, now: now(), flags: flags(), feedId: query.data.feed, limit: query.data.limit });
  return Response.json(body, { headers: { "Cache-Control": NEWS_CACHE_CONTROL } });
}
