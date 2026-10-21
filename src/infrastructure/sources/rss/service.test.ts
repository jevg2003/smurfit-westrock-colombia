import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { NEWS_FEEDS } from "./feeds";
import { loadNews } from "./service";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const NOW = new Date("2026-10-21T01:00:00.000Z");
const FLAGS = { newsRss: true, googleNews: true, minambiente: true, presidencia: true };

const BODY_BY_HOST: Record<string, string> = {
  "www.portafolio.co": "portafolio-economia.sample.xml",
  "www.eltiempo.com": "eltiempo-economia.sample.xml",
  "www.larepublica.co": "larepublica.sample.xml",
  "www.valoraanalitik.com": "valora.sample.xml",
  "www.elcolombiano.com": "elcolombiano-negocios.sample.xml",
};

function fakeFetch(failures: Record<string, "500" | "network" | "garbage"> = {}) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const host = new URL(url).host;
    const failure = failures[host];
    if (failure === "network") throw new Error("offline");
    if (failure === "500") return new Response("boom", { status: 500 });
    if (failure === "garbage") return new Response("<html>not a feed</html>", { status: 200 });
    const file = BODY_BY_HOST[host];
    return file ? new Response(fixture(file), { status: 200 }) : new Response("nope", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const run = (fetchImpl: typeof fetch, options: Partial<Parameters<typeof loadNews>[0]> = {}) =>
  loadNews({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }), now: NOW, flags: FLAGS, limit: 100, ...options });

describe("loadNews", () => {
  it("fetches only the closed list of feeds and merges them newest first", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl);
    const allowed = new Set<string>(NEWS_FEEDS.map((feed) => feed.url));
    expect(calls.every((url) => allowed.has(url))).toBe(true);
    expect(calls).toHaveLength(NEWS_FEEDS.length);
    expect(result.feeds.map((f) => f.status)).toEqual(NEWS_FEEDS.map(() => "ok"));
    const dates = result.items.map((i) => Date.parse(i.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(Object.keys(result.items[0]).sort()).toEqual(["feedId", "id", "outlet", "publishedAt", "title", "url", "via"]);
    expect(result.items.every((i) => i.via === "rss")).toBe(true);
  });

  it("isolates a failing feed and reports its health", async () => {
    const { fetchImpl } = fakeFetch({ "www.portafolio.co": "500", "www.eltiempo.com": "network", "www.larepublica.co": "garbage" });
    const result = await run(fetchImpl);
    const status = Object.fromEntries(result.feeds.map((f) => [f.id, f.status]));
    expect(status).toMatchObject({ portafolio: "error", eltiempo: "error", larepublica: "error", valora: "ok", elcolombiano: "ok" });
    expect(result.feeds.find((f) => f.id === "portafolio")).toMatchObject({ httpStatus: 500 });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("requests a single feed when an id is given", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl, { feedId: "valora" });
    expect(calls).toEqual([NEWS_FEEDS.find((f) => f.id === "valora")!.url]);
    expect(result.items.every((i) => i.feedId === "valora")).toBe(true);
  });

  it("does not request any feed when the media flag is off", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl, { flags: { ...FLAGS, newsRss: false } });
    expect(calls).toEqual([]);
    expect(result.feeds.every((f) => f.status === "disabled")).toBe(true);
    expect(result.items).toEqual([]);
  });

  it("applies the limit", async () => {
    const { fetchImpl } = fakeFetch();
    expect((await run(fetchImpl, { limit: 5 })).items).toHaveLength(5);
  });
});
