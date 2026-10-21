import { handleNewsRequest } from "@/infrastructure/sources/rss/handler";

/** Cache of the upstream feeds in the Next fetch cache: 30 minutes. */
const revalidateSeconds = 1800;

const cachedFetch: typeof fetch = (input, init) => fetch(input, { ...init, next: { revalidate: revalidateSeconds } });

/**
 * Closed proxy for the media RSS feeds (no CORS in the browser). The client may only name a feed id
 * from `NEWS_FEEDS`; it can never pass a URL.
 */
export async function GET(request: Request) {
  return handleNewsRequest(request, { fetchImpl: cachedFetch });
}
