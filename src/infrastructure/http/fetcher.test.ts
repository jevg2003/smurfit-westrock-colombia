import { describe, expect, it, vi } from "vitest";
import { FetchFailure, createFetcher } from "./fetcher";

const ok = () => new Response("{}", { status: 200 });
const status = (code: number) => new Response("", { status: code });

describe("createFetcher", () => {
  it("returns the response of a successful call", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());
    const response = await createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a");
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on a 5xx and returns the retry", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok());
    const response = await createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a");
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns the second 5xx without a third attempt", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(500));
    const response = await createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a");
    expect(response.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(429));
    const response = await createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a");
    expect(response.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 4xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(404));
    await createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("wraps a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(createFetcher({ fetchImpl, retryDelayMs: 0 })("https://x.test/a")).rejects.toMatchObject({
      name: "FetchFailure",
      reason: "network",
    });
  });

  it("passes a timeout signal and reports a timeout", async () => {
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
    );
    const promise = createFetcher({ fetchImpl, timeoutMs: 20, retryDelayMs: 0 })("https://x.test/a");
    await expect(promise).rejects.toBeInstanceOf(FetchFailure);
    await expect(promise).rejects.toMatchObject({ reason: "timeout" });
  });
});
