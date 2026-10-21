import { ENERGY_REVALIDATE_SECONDS, handleEnergyRequest } from "@/infrastructure/sources/xm/handler";

/** Upstream cache in the Next fetch cache: 6 hours (XM publishes one value per day). */
const cachedFetch: typeof fetch = (input, init) => fetch(input, { ...init, next: { revalidate: ENERGY_REVALIDATE_SECONDS } });

/**
 * Closed proxy for the XM public API (it sends no CORS headers, so the browser cannot call it).
 * The client may only choose `days` (1 to 60); it can never pass a URL, a metric or a body.
 */
export async function GET(request: Request) {
  return handleEnergyRequest(request, { fetchImpl: cachedFetch });
}
