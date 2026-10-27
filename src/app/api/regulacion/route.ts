import { handleRegulationRequest } from "@/infrastructure/sources/regulation/handler";

/** Cache of the upstream sources in the Next fetch cache: 30 minutes. */
const revalidateSeconds = 1800;

const cachedFetch: typeof fetch = (input, init) => fetch(input, { ...init, next: { revalidate: revalidateSeconds } });

/**
 * Closed proxy for the Minambiente feed (CORS limited to its own domain) and the Presidencia decrees
 * dataset. The client may only choose `source` and send the keywords of its company; it can never pass a URL or a query.
 */
export async function POST(request: Request) {
  return handleRegulationRequest(request, { fetchImpl: cachedFetch });
}
