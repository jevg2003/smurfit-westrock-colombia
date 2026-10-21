import { describe, expect, it } from "vitest";
import type { NewsItem } from "../domain/news";
import { matchNewsItems } from "./match-news";

const base: NewsItem = {
  id: "n1",
  title: "Smurfit Westrock apuesta por el reciclaje de papel",
  url: "https://example.test/1",
  outlet: "Portafolio",
  publishedAt: "2026-10-19T10:00:00.000Z",
  via: "rss",
  matchedTerms: [],
  matches: [],
  provenance: { sourceId: "news-rss", url: "https://example.test/1", fetchedAt: "2026-10-20T00:00:00.000Z", license: "n/a", attribution: "Portafolio" },
};

const GROUPS = [
  { id: "company", label: "Empresa", terms: ["Smurfit Westrock"] },
  { id: "sector", label: "Sector", terms: ["papel"] },
  { id: "regulation", label: "Regulación", terms: ["reciclaje"] },
];

describe("matchNewsItems", () => {
  it("fills matches and matchedTerms from the current term groups, without mutating the input", () => {
    const [item] = matchNewsItems([base], GROUPS);
    expect(item.matches).toEqual([
      { groupId: "company", term: "Smurfit Westrock" },
      { groupId: "sector", term: "papel" },
      { groupId: "regulation", term: "reciclaje" },
    ]);
    expect(item.matchedTerms).toEqual(["Smurfit Westrock", "papel", "reciclaje"]);
    expect(base.matches).toEqual([]);
  });

  it("returns items with no match as they are (empty matches)", () => {
    const [item] = matchNewsItems([{ ...base, title: "Nada que ver" }], GROUPS);
    expect(item.matches).toEqual([]);
  });
});
