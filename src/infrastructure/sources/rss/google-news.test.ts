import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NEWS_TERM_GROUPS } from "@/content/config/empresa";
import { GOOGLE_NEWS_MAX_QUERIES, buildGoogleNewsQueries, buildGoogleNewsUrl, parseGoogleNews } from "./google-news";

const fixture = readFileSync(new URL("./fixtures/google-news.sample.xml", import.meta.url), "utf8");

describe("buildGoogleNewsQueries", () => {
  it("builds a bounded number of OR queries from the term groups, quoting multi-word terms", () => {
    const queries = buildGoogleNewsQueries(NEWS_TERM_GROUPS);
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.length).toBeLessThanOrEqual(GOOGLE_NEWS_MAX_QUERIES);
    expect(queries[0]).toBe('"Cartón de Colombia" OR "Smurfit Westrock" OR "Cartones América" OR "Carvajal Empaques" OR "Papeles y Cartones"');
  });

  it("limits terms per query, skips empty terms and empty groups", () => {
    const groups = [
      { id: "a", label: "A", terms: ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho"] },
      { id: "b", label: "B", terms: ["", "  "] },
    ];
    const queries = buildGoogleNewsQueries(groups);
    expect(queries).toHaveLength(1);
    expect(queries[0].split(" OR ")).toHaveLength(6);
  });

  it("drops characters that could alter the query structure", () => {
    const [query] = buildGoogleNewsQueries([{ id: "a", label: "A", terms: ['x" OR site:evil.test', "ok"] }]);
    expect(query).not.toContain("site:");
    expect(query.match(/"/g)?.length ?? 0).toBeLessThanOrEqual(4);
  });
});

describe("buildGoogleNewsUrl", () => {
  it("builds the Spanish-Colombia search URL with the query URL-encoded", () => {
    const url = buildGoogleNewsUrl('"Smurfit Westrock" OR Yumbo & más');
    expect(url).toBe(
      "https://news.google.com/rss/search?q=%22Smurfit%20Westrock%22%20OR%20Yumbo%20%26%20m%C3%A1s&hl=es-419&gl=CO&ceid=CO:es-419",
    );
    expect(new URL(url).host).toBe("news.google.com");
  });
});

describe("parseGoogleNews (real recorded feed)", () => {
  const items = parseGoogleNews(fixture);

  it("keeps the original outlet from <source> and strips the outlet suffix from the title", () => {
    expect(items).toHaveLength(8);
    const first = items[0];
    expect(first.outlet).toBe("El Tiempo");
    expect(first.title).toBe("Smurfit Westrock nombra a Andrés Muñoz como CEO para Colombia, Ecuador y Perú tras 35 años en la organización");
    expect(first.url).toMatch(/^https:\/\/news\.google\.com\/rss\/articles\//);
  });

  it("returns only title, url, date and outlet", () => {
    expect(Object.keys(items[0]).sort()).toEqual(["outlet", "publishedAt", "title", "url"]);
  });

  it("falls back to the title suffix when <source> is missing and to 'Google News' otherwise", () => {
    const xml = (inner: string) =>
      `<rss version="2.0"><channel><item><title>${inner}</title><link>https://news.google.com/rss/articles/x</link><pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseGoogleNews(xml("Algo pasa - La República"))[0]).toMatchObject({ outlet: "La República", title: "Algo pasa" });
    expect(parseGoogleNews(xml("Sin medio"))[0]).toMatchObject({ outlet: "Google News", title: "Sin medio" });
  });
});
