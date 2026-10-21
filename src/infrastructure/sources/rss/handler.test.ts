import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/news/route";
import { handleNewsRequest } from "./handler";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const NOW = new Date("2026-10-21T01:00:00.000Z");
const FLAGS = { newsRss: true, googleNews: true, minambiente: true, presidencia: true };

const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("portafolio")) return new Response(fixture("portafolio-economia.sample.xml"), { status: 200 });
  return new Response("down", { status: 503 });
}) as unknown as typeof fetch;

const call = (query: string, flags = FLAGS) =>
  handleNewsRequest(new Request(`http://localhost/api/news${query}`), { fetchImpl, now: () => NOW, flags: () => flags });

describe("GET /api/news", () => {
  it("rejects a feed id that is not in the closed list with 400, without fetching anything", async () => {
    vi.mocked(fetchImpl).mockClear();
    const response = await call("?feed=unknown");
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a URL passed by the client (open proxy / SSRF attempt)", async () => {
    vi.mocked(fetchImpl).mockClear();
    for (const query of ["?url=http://169.254.169.254/latest", "?feed=portafolio&url=http://localhost:3000", "?feed=http://evil.test/rss"]) {
      expect((await call(query)).status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an invalid limit", async () => {
    expect((await call("?limit=0")).status).toBe(400);
    expect((await call("?limit=5000")).status).toBe(400);
    expect((await call("?limit=abc")).status).toBe(400);
  });

  it("answers 200 with items, per-feed health and cache headers even when most feeds fail", async () => {
    const response = await call("");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=1800, stale-while-revalidate=3600");
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.feeds.find((f: { id: string }) => f.id === "portafolio").status).toBe("ok");
    expect(body.feeds.find((f: { id: string }) => f.id === "eltiempo")).toMatchObject({ status: "error", httpStatus: 503 });
  });

  it("answers a single feed by id and honors the limit", async () => {
    const body = await (await call("?feed=portafolio&limit=3")).json();
    expect(body.items).toHaveLength(3);
    expect(body.feeds).toHaveLength(1);
  });

  it("accepts google-news as a source id and reports it disabled when its flag is off", async () => {
    const body = await (await call("?feed=google-news", { ...FLAGS, googleNews: false })).json();
    expect(body.feeds).toEqual([expect.objectContaining({ id: "google-news", status: "disabled" })]);
  });

  it("reports a switched-off source as disabled", async () => {
    const body = await (await call("", { ...FLAGS, newsRss: false, googleNews: false })).json();
    expect(body.items).toEqual([]);
    expect(body.feeds.every((f: { status: string }) => f.status === "disabled")).toBe(true);
  });

  it("the route handler itself rejects an unknown feed id", async () => {
    const response = await GET(new Request("http://localhost/api/news?feed=unknown"));
    expect(response.status).toBe(400);
  });
});
