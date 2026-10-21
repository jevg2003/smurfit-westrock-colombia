import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { createNewsAdapter } from "./client-adapter";

const NOW = new Date("2026-10-21T01:00:00.000Z");
const body = {
  items: [
    { id: "news:aaaaaaaa", title: "Smurfit Westrock invierte", url: "https://www.portafolio.co/a", outlet: "Portafolio", publishedAt: "2026-10-20T10:00:00.000Z", via: "rss", feedId: "portafolio" },
    { id: "news:bbbbbbbb", title: "Otro titular", url: "https://news.google.com/rss/articles/x", outlet: "El Tiempo", publishedAt: "2026-10-19T10:00:00.000Z", via: "google-news", feedId: "google-news" },
  ],
  feeds: [{ id: "portafolio", outlet: "Portafolio", status: "ok", count: 1 }],
  fetchedAt: "2026-10-21T00:59:00.000Z",
};

const adapterFor = (response: Response | Error) => {
  const fetchImpl = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
  return { fetchImpl, adapter: createNewsAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) }) };
};

describe("news client adapter", () => {
  it("calls only the same-origin /api/news route and maps items with their provenance", async () => {
    const { adapter, fetchImpl } = adapterFor(new Response(JSON.stringify(body), { status: 200 }));
    const result = await adapter.fetch({ limit: 50 }, { now: NOW });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe("/api/news?limit=50");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [direct, google] = result.value.data.items;
    expect(direct).toMatchObject({ outlet: "Portafolio", via: "rss", matchedTerms: [], provenance: { sourceId: "news-rss", url: "https://www.portafolio.co/a", attribution: "Portafolio" } });
    expect(google).toMatchObject({ outlet: "El Tiempo", via: "google-news", provenance: { sourceId: "google-news" } });
    expect(result.value.data.feeds).toHaveLength(1);
  });

  it("drops items whose link is not http(s) even if the server sent them", async () => {
    const bad = { ...body, items: [{ ...body.items[0], url: "javascript:alert(1)" }, body.items[1]] };
    const { adapter } = adapterFor(new Response(JSON.stringify(bad), { status: 200 }));
    const result = await adapter.fetch({}, { now: NOW });
    expect(result.ok && result.value.data.items).toHaveLength(1);
  });

  it("reports a schema error when the answer changes shape", async () => {
    const { adapter } = adapterFor(new Response(JSON.stringify({ nope: true }), { status: 200 }));
    expect(await adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("reports a network error and an HTTP error", async () => {
    expect(await adapterFor(new Error("offline")).adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
    expect(await adapterFor(new Response("x", { status: 400 })).adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network", status: 400 } });
  });

  it("reports the source as disabled when every feed is switched off", async () => {
    const off = { items: [], feeds: [{ id: "portafolio", outlet: "Portafolio", status: "disabled", count: 0 }], fetchedAt: body.fetchedAt };
    const { adapter } = adapterFor(new Response(JSON.stringify(off), { status: 200 }));
    expect(await adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "disabled" } });
  });

  it("reports empty when the feeds work but there are no headlines", async () => {
    const empty = { items: [], feeds: [{ id: "portafolio", outlet: "Portafolio", status: "ok", count: 0 }], fetchedAt: body.fetchedAt };
    const { adapter } = adapterFor(new Response(JSON.stringify(empty), { status: 200 }));
    expect(await adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "empty" } });
  });

  it("reports a network error when every feed failed on the server", async () => {
    const down = { items: [], feeds: [{ id: "portafolio", outlet: "Portafolio", status: "error", count: 0, message: "x" }], fetchedAt: body.fetchedAt };
    const { adapter } = adapterFor(new Response(JSON.stringify(down), { status: 200 }));
    expect(await adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });
});
