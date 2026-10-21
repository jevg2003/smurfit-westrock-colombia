import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFeed } from "./parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("parseFeed (real recorded feeds)", () => {
  it("parses Portafolio: plain titles, http(s) links and ISO dates", () => {
    const items = parseFeed(fixture("portafolio-economia.sample.xml"));
    expect(items).toHaveLength(10);
    for (const item of items) {
      expect(item.title).not.toMatch(/[<>]/);
      expect(item.url).toMatch(/^https:\/\/www\.portafolio\.co\//);
      expect(item.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    }
    expect(items[0].title).toBe("Colombia buscará créditos más baratos del BID para reducir el costo de su deuda a largo plazo");
    expect(items[0].publishedAt).toBe("2026-10-21T00:28:48.000Z");
  });

  it("parses La República (starts with a BOM) with RFC 822 dates", () => {
    const items = parseFeed(fixture("larepublica.sample.xml"));
    expect(items).toHaveLength(8);
    expect(items[0].publishedAt).toBe("2026-10-21T00:45:30.000Z");
  });

  it("parses Valora Analitik: CDATA, and dates without a zone are read as UTC", () => {
    const items = parseFeed(fixture("valora.sample.xml"));
    expect(items).toHaveLength(6);
    expect(items[0].publishedAt).toBe("2026-10-21T00:30:00.000Z");
    expect(items[0].title).toBe("Integración de Claro y Azteca: CRC pide mayores garantías para la competencia");
  });

  it("returns no body or image fields", () => {
    const [item] = parseFeed(fixture("eltiempo-economia.sample.xml"));
    expect(Object.keys(item).sort()).toEqual(["publishedAt", "title", "url"]);
  });
});

describe("parseFeed (unsafe input)", () => {
  const wrap = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`;
  const item = (title: string, link: string, date = "Tue, 20 Oct 2026 12:00:00 GMT") =>
    `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`;

  it("drops javascript: and data: links and items with an invalid date", () => {
    const xml = wrap(
      item("a", "javascript:alert(1)") + item("b", "data:text/html,x") + item("c", "https://ok.test/c", "no es fecha") + item("d", "https://ok.test/d"),
    );
    expect(parseFeed(xml).map((i) => i.title)).toEqual(["d"]);
  });

  it("turns markup in titles into plain text", () => {
    const xml = wrap(item("&lt;img src=x onerror=alert(1)&gt; Hola <![CDATA[<b>mundo</b>]]>", "https://ok.test/e"));
    const [parsed] = parseFeed(xml);
    expect(parsed.title).toContain("<img src=x onerror=alert(1)> Hola");
    expect(parsed.title).toContain("mundo");
    expect(parsed.title).not.toContain("<b>");
  });

  it("returns an empty list for malformed or non-feed XML", () => {
    expect(parseFeed("<html><body>no feed</body></html>")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
  });
});
