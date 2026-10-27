import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildProfileTermGroups } from "@/core/company/context";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import {
  GOOGLE_NEWS_MAX_QUERIES,
  GOOGLE_NEWS_MAX_QUERY_LENGTH,
  buildGoogleNewsQueries,
  buildGoogleNewsSearches,
  buildGoogleNewsUrl,
  parseGoogleNews,
} from "./google-news";

const fixture = readFileSync(new URL("./fixtures/google-news.sample.xml", import.meta.url), "utf8");

const NEWS_TERM_GROUPS = buildProfileTermGroups(TEST_COMPANY);

describe("buildGoogleNewsQueries", () => {
  it("builds one query per group from quoted exact phrases, OR-joined, limited to the last 30 days", () => {
    const queries = buildGoogleNewsQueries(NEWS_TERM_GROUPS);
    expect(queries).toHaveLength(NEWS_TERM_GROUPS.length);
    expect(queries.length).toBeLessThanOrEqual(GOOGLE_NEWS_MAX_QUERIES);
    expect(queries[0]).toBe(
      '("Empresa Ejemplo" OR "Competidora Uno" OR "Competidora Dos" OR "Competidora Tres") when:30d',
    );
    expect(queries[1]).toContain('"piezas metálicas" OR "industria metalmecánica"');
    for (const query of queries) expect(query).toMatch(/\) when:30d$/);
  });

  it("quotes single words too, so a generic word is never searched on its own", () => {
    const [query] = buildGoogleNewsQueries([{ id: "a", label: "A", terms: ["celulosa", "Itagüí"] }]);
    expect(query).toBe('("celulosa" OR "Itagüí") when:30d');
  });

  it("keeps each query within the length budget, dropping the terms that do not fit", () => {
    const terms = Array.from({ length: 40 }, (_, index) => `frase número ${index + 1} de prueba`);
    const [query] = buildGoogleNewsQueries([{ id: "a", label: "A", terms }]);
    expect(query.length).toBeLessThanOrEqual(GOOGLE_NEWS_MAX_QUERY_LENGTH);
    expect(query).toContain('"frase número 1 de prueba"');
    expect(query).not.toContain('"frase número 40 de prueba"');
  });

  it("skips empty terms and empty groups", () => {
    const queries = buildGoogleNewsQueries([
      { id: "a", label: "A", terms: ["uno", "", "  "] },
      { id: "b", label: "B", terms: ["", "  "] },
    ]);
    expect(queries).toEqual(['("uno") when:30d']);
  });

  it("drops characters that could alter the query structure", () => {
    const [query] = buildGoogleNewsQueries([{ id: "a", label: "A", terms: ['x" OR site:evil.test', "ok"] }]);
    expect(query).not.toContain("site:");
    expect(query.match(/"/g)?.length).toBe(4);
    expect(query).not.toMatch(/[()].*[()].*[()]/);
  });
});

describe("buildGoogleNewsSearches", () => {
  it("keeps the group id of each query so the items can be capped per group", () => {
    const searches = buildGoogleNewsSearches([
      { id: "a", label: "A", terms: ["uno"] },
      { id: "empty", label: "E", terms: [""] },
      { id: "c", label: "C", terms: ["tres"] },
    ]);
    expect(searches.map((search) => search.groupId)).toEqual(["a", "c"]);
  });
});

describe("buildGoogleNewsUrl", () => {
  it("builds the Spanish-Colombia search URL with the query URL-encoded", () => {
    const url = buildGoogleNewsUrl('("Empresa Ejemplo" OR "Itagüí") when:30d');
    const parsed = new URL(url);
    expect(parsed.host).toBe("news.google.com");
    expect(parsed.pathname).toBe("/rss/search");
    expect(parsed.searchParams.get("q")).toBe('("Empresa Ejemplo" OR "Itagüí") when:30d');
    expect(parsed.searchParams.get("hl")).toBe("es-419");
    expect(parsed.searchParams.get("gl")).toBe("CO");
    expect(parsed.searchParams.get("ceid")).toBe("CO:es-419");
  });
});

describe("parseGoogleNews (real recorded feed)", () => {
  const items = parseGoogleNews(fixture);

  it("keeps the original outlet from <source> and strips the outlet suffix from the title", () => {
    expect(items).toHaveLength(8);
    const first = items[0];
    expect(first.outlet).toBe("El Tiempo");
    expect(first.title).toBe("Empresa Ejemplo nombra a Andrés Muñoz como CEO para Colombia, Ecuador y Perú tras 35 años en la organización");
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
