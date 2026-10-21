export type FetchFailureReason = "network" | "timeout" | "aborted";

/** Thrown when no HTTP response was obtained. HTTP error statuses are returned, not thrown. */
export class FetchFailure extends Error {
  readonly reason: FetchFailureReason;

  constructor(reason: FetchFailureReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FetchFailure";
    this.reason = reason;
  }
}

export interface FetcherOptions {
  /** Injected so tests need no network. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 300;

const sleep = (ms: number) => (ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * Fetch with a per-attempt timeout and exactly one retry on a 5xx response.
 * A 429 and any other status are returned as they are (no retry).
 * Network errors and timeouts throw `FetchFailure` and are not retried.
 */
export function createFetcher({
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: FetcherOptions = {}): Fetcher {
  const attempt = async (url: string, init: RequestInit | undefined): Promise<Response> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout;
    try {
      return await fetchImpl(url, { ...init, signal });
    } catch (error) {
      if (timeout.aborted) throw new FetchFailure("timeout", `Timed out after ${timeoutMs} ms`, { cause: error });
      if (init?.signal?.aborted) throw new FetchFailure("aborted", "Request aborted", { cause: error });
      throw new FetchFailure("network", error instanceof Error ? error.message : "Network error", { cause: error });
    }
  };

  return async (url, init) => {
    const first = await attempt(url, init);
    if (first.status < 500) return first;
    await sleep(retryDelayMs);
    return attempt(url, init);
  };
}
