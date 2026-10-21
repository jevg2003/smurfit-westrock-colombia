import { describe, expect, it } from "vitest";
import type { NewsItem } from "../domain/news";
import { NEWS_KEYWORD_MENTION_RULE_ID, detectNewsKeywordMentions } from "./news-keyword-mention";
import { fixedClock } from "./test-fixtures";

const NOW = "2026-10-20T15:00:00.000Z";
const GROUPS = [
  { id: "company", label: "Empresa y competidores", terms: ["Smurfit Westrock", "Cartones América"] },
  { id: "sector", label: "Sector", terms: ["papel"] },
  { id: "regulation", label: "Regulación y sostenibilidad", terms: ["REP envases", "reciclaje"] },
];

function makeNews(id: string, title: string, publishedAt: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title,
    url: `https://example.test/${id}`,
    outlet: "Portafolio",
    publishedAt,
    via: "rss",
    matchedTerms: [],
    matches: [],
    provenance: {
      sourceId: "news-rss",
      url: `https://example.test/${id}`,
      fetchedAt: NOW,
      license: "Solo titular y enlace",
      attribution: "Portafolio",
    },
    ...overrides,
  };
}

const run = (news: NewsItem[]) => detectNewsKeywordMentions({ news, groups: GROUPS, clock: fixedClock(NOW) });

describe("news.keyword-mention.v1", () => {
  it("signals a company mention as info in the market dimension and shows group and term", () => {
    const [signal] = run([makeNews("a", "Smurfit Westrock abre planta", "2026-10-19T10:00:00.000Z")]);
    expect(signal).toMatchObject({
      ruleId: NEWS_KEYWORD_MENTION_RULE_ID,
      dimension: "market",
      severity: "info",
      pestel: "social",
      evidence: [{ kind: "news", ref: "a" }],
    });
    expect(signal.ruleText).toContain("Empresa y competidores");
    expect(signal.ruleText).toContain("Smurfit Westrock");
    expect(signal.ruleText).toContain("7 días");
  });

  it("tags regulation terms as the regulation dimension", () => {
    const [signal] = run([makeNews("r", "Nuevas metas de REP envases", "2026-10-19T10:00:00.000Z")]);
    expect(signal).toMatchObject({ dimension: "regulation", severity: "info", pestel: "legal" });
  });

  it("does not signal sector-only matches", () => {
    expect(run([makeNews("s", "Sube el papel", "2026-10-19T10:00:00.000Z")])).toEqual([]);
  });

  it("includes exactly 7 days ago and excludes 8 days or future dates", () => {
    expect(run([makeNews("a", "Smurfit Westrock", "2026-10-13T15:00:00.000Z")])).toHaveLength(1);
    expect(run([makeNews("a", "Smurfit Westrock", "2026-10-13T14:59:59.000Z")])).toEqual([]);
    expect(run([makeNews("a", "Smurfit Westrock", "2026-10-21T15:00:00.000Z")])).toEqual([]);
  });

  it("emits one signal per matching group and labels Google News items", () => {
    const signals = run([
      makeNews("g", "Smurfit Westrock y el reciclaje", "2026-10-19T10:00:00.000Z", { via: "google-news" }),
    ]);
    expect(signals.map((s) => s.dimension).sort()).toEqual(["market", "regulation"]);
    expect(signals[0].detail).toContain("vía Google News");
    expect(new Set(signals.map((s) => s.id)).size).toBe(2);
  });

  it("uses the term group of the preferences (an emptied group never matches)", () => {
    const groups = GROUPS.map((g) => (g.id === "company" ? { ...g, terms: [] } : g));
    expect(detectNewsKeywordMentions({ news: [makeNews("a", "Smurfit Westrock", "2026-10-19T10:00:00.000Z")], groups, clock: fixedClock(NOW) })).toEqual([]);
  });
});
