import { describe, expect, it } from "vitest";
import { mergeHeadlines, type SourcedHeadline } from "./merge";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const h = (over: Partial<SourcedHeadline>): SourcedHeadline => ({
  title: "Titular",
  url: "https://a.test/x",
  publishedAt: "2026-10-19T10:00:00.000Z",
  outlet: "Portafolio",
  via: "rss",
  feedId: "portafolio",
  ...over,
});

describe("mergeHeadlines", () => {
  it("dedupes by canonical URL (utm parameters) keeping the first", () => {
    const merged = mergeHeadlines([h({ url: "https://a.test/x?utm_source=rss" }), h({ title: "Otro", url: "https://a.test/x" })], NOW);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe("https://a.test/x");
  });

  it("dedupes by normalized title across outlets, preferring the direct RSS link over Google News", () => {
    const merged = mergeHeadlines(
      [
        h({ title: "Dólar sube hoy - El Tiempo", url: "https://news.google.com/rss/articles/abc", outlet: "El Tiempo", via: "google-news", feedId: "google-news" }),
        h({ title: "Dólar sube hoy", url: "https://www.eltiempo.com/d", outlet: "El Tiempo", feedId: "eltiempo" }),
      ],
      NOW,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].via).toBe("rss");
  });

  it("keeps only the last 12 months and drops dates more than a day in the future, newest first", () => {
    const merged = mergeHeadlines(
      [
        h({ title: "viejo", url: "https://a.test/1", publishedAt: "2025-10-19T00:00:00.000Z" }),
        h({ title: "limite", url: "https://a.test/2", publishedAt: "2025-10-20T15:00:00.000Z" }),
        h({ title: "futuro", url: "https://a.test/3", publishedAt: "2026-10-22T00:00:00.000Z" }),
        h({ title: "nuevo", url: "https://a.test/4", publishedAt: "2026-10-20T10:00:00.000Z" }),
      ],
      NOW,
    );
    expect(merged.map((i) => i.title)).toEqual(["nuevo", "limite"]);
  });

  it("gives stable ids derived from the canonical URL", () => {
    const [a] = mergeHeadlines([h({ url: "https://a.test/x?utm_medium=1" })], NOW);
    const [b] = mergeHeadlines([h({ url: "https://a.test/x" })], NOW);
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^news:[0-9a-f]{8}$/);
  });
});
