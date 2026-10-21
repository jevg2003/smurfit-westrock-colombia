import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { NEWS_TERM_GROUPS } from "@/content/config/empresa";
import { NEWS_FEEDS } from "./feeds";
import { buildGoogleNewsQueries, buildGoogleNewsUrl } from "./google-news";
import { loadNews } from "./service";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const NOW = new Date("2026-10-21T01:00:00.000Z");
const FLAGS = { newsRss: true, googleNews: true, minambiente: true, presidencia: true };

const GOOGLE_URLS = buildGoogleNewsQueries(NEWS_TERM_GROUPS).map(buildGoogleNewsUrl);

const BODY_BY_HOST: Record<string, string> = {
  "news.google.com": "google-news.sample.xml",
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
    const allowed = new Set<string>([...NEWS_FEEDS.map((feed) => feed.url), ...GOOGLE_URLS]);
    expect(calls.every((url) => allowed.has(url))).toBe(true);
    expect(calls).toHaveLength(NEWS_FEEDS.length + GOOGLE_URLS.length);
    expect(result.feeds.map((f) => f.status)).toEqual([...NEWS_FEEDS.map(() => "ok"), "ok"]);
    const dates = result.items.map((i) => Date.parse(i.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(Object.keys(result.items[0]).sort()).toEqual(["feedId", "id", "outlet", "publishedAt", "title", "url", "via"]);
    expect(new Set(result.items.map((i) => i.via))).toEqual(new Set(["rss", "google-news"]));
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

  it("does not request any media feed when the media flag is off (Google News still runs)", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl, { flags: { ...FLAGS, newsRss: false } });
    expect(calls.every((url) => url.startsWith("https://news.google.com/"))).toBe(true);
    expect(result.feeds.filter((f) => f.id !== "google-news").every((f) => f.status === "disabled")).toBe(true);
    expect(result.items.every((i) => i.via === "google-news")).toBe(true);
  });

  it("does not request Google News when its flag is off", async () => {
    const { fetchImpl, calls } = fakeFetch();
    const result = await run(fetchImpl, { flags: { ...FLAGS, googleNews: false } });
    expect(calls.some((url) => url.includes("news.google.com"))).toBe(false);
    expect(result.feeds.find((f) => f.id === "google-news")).toMatchObject({ status: "disabled", count: 0 });
    expect(result.items.every((i) => i.via === "rss")).toBe(true);
  });

  it("keeps the original outlet of Google News items and labels them", async () => {
    const { fetchImpl } = fakeFetch();
    const result = await run(fetchImpl, { feedId: "google-news" });
    expect(result.feeds).toHaveLength(1);
    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item).toMatchObject({ via: "google-news", feedId: "google-news" });
      expect(item.outlet).not.toBe("Google News");
      expect(item.url).toMatch(/^https:\/\/news\.google\.com\//);
    }
  });

  it("isolates a failing Google News query and reports how many failed", async () => {
    const { fetchImpl: base } = fakeFetch();
    const failing = GOOGLE_URLS[1];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input) === failing ? new Response("x", { status: 503 }) : base(input, init),
    ) as unknown as typeof fetch;
    const result = await run(fetchImpl, { feedId: "google-news" });
    expect(result.feeds[0]).toMatchObject({ status: "ok" });
    expect(result.feeds[0].message).toContain(`1 de ${GOOGLE_URLS.length}`);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("reports an error when every Google News query fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("x", { status: 503 })) as unknown as typeof fetch;
    const result = await run(fetchImpl, { feedId: "google-news" });
    expect(result.feeds[0]).toMatchObject({ status: "error", count: 0 });
    expect(result.items).toEqual([]);
  });

  it("applies the limit", async () => {
    const { fetchImpl } = fakeFetch();
    expect((await run(fetchImpl, { limit: 5 })).items).toHaveLength(5);
  });
});
