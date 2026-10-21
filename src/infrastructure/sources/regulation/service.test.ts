import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { handleRegulationRequest } from "./handler";
import { loadRegulation } from "./service";

const minambiente = readFileSync(new URL("../rss/fixtures/minambiente.sample.xml", import.meta.url), "utf8");
const decrees = readFileSync(new URL("./fixtures/decretos.sample.json", import.meta.url), "utf8");
const NOW = new Date("2026-10-20T15:00:00.000Z");
const FLAGS = { newsRss: true, googleNews: true, minambiente: true, presidencia: true, xm: true };

function fakeFetch(failures: { minambiente?: boolean; presidencia?: boolean } = {}) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("minambiente.gov.co")) return failures.minambiente ? new Response("x", { status: 503 }) : new Response(minambiente, { status: 200 });
    if (url.includes("datos.gov.co")) return failures.presidencia ? new Response("x", { status: 500 }) : new Response(decrees, { status: 200 });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const run = (fetchImpl: typeof fetch, options: Partial<Parameters<typeof loadRegulation>[0]> = {}) =>
  loadRegulation({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }), now: NOW, flags: FLAGS, ...options });

describe("loadRegulation", () => {
  it("returns Minambiente posts (title, date and link only) and keyword-filtered decrees", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl);
    expect(calls).toHaveLength(2);
    expect(calls).toContain("https://www.minambiente.gov.co/feed/");
    expect(calls.some((url) => /^https:\/\/www\.datos\.gov\.co\/resource\/88h2-dykw\.json\?/.test(url))).toBe(true);
    expect(result.minambiente).toMatchObject({ status: "ok" });
    expect(result.minambiente.items).toHaveLength(12);
    expect(Object.keys(result.minambiente.items[0]).sort()).toEqual(["id", "kind", "publishedAt", "title", "url"]);
    expect(result.presidencia.status).toBe("ok");
    expect(result.presidencia.items.every((item) => item.kind === "decree")).toBe(true);
  });

  it("isolates a failing source", async () => {
    const down = await run(fakeFetch({ minambiente: true }).fetchImpl);
    expect(down.minambiente).toMatchObject({ status: "error", httpStatus: 503, items: [] });
    expect(down.presidencia.status).toBe("ok");
    const down2 = await run(fakeFetch({ presidencia: true }).fetchImpl);
    expect(down2.presidencia).toMatchObject({ status: "error", httpStatus: 500 });
    expect(down2.minambiente.status).toBe("ok");
  });

  it("does not fetch a source whose flag is off", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl, { flags: { ...FLAGS, minambiente: false } });
    expect(calls.some((url) => url.includes("minambiente.gov.co"))).toBe(false);
    expect(result.minambiente).toMatchObject({ status: "disabled", items: [] });
  });

  it("fetches only the requested source", async () => {
    const { fetchImpl, calls } = fakeFetch();
    await run(fetchImpl, { source: "presidencia" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("datos.gov.co");
  });
});

describe("GET /api/regulacion handler", () => {
  const { fetchImpl } = fakeFetch();
  const call = (query: string) =>
    handleRegulationRequest(new Request(`http://localhost/api/regulacion${query}`), { fetchImpl, now: () => NOW, flags: () => FLAGS });

  it("rejects unknown sources and any client-provided URL with 400", async () => {
    for (const query of ["?source=unknown", "?url=http://169.254.169.254", "?source=minambiente&feed=http://evil.test"]) {
      expect((await call(query)).status).toBe(400);
    }
  });

  it("answers with cache headers", async () => {
    const response = await call("");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=1800, stale-while-revalidate=3600");
    expect((await response.json()).minambiente.items.length).toBe(12);
  });
});
