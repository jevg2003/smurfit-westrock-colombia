import { describe, expect, it } from "vitest";
import type { NewsItem } from "../domain/news";
import { filterRelevantNews, matchNewsItems, sortByRelevance } from "./match-news";

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

describe("filterRelevantNews", () => {
  it("keeps only items that match at least one term, accent-insensitively and on whole words", () => {
    const groups = [{ id: "sector", label: "Sector", terms: ["cartón corrugado", "papel kraft"] }];
    const items = matchNewsItems(
      [
        { ...base, id: "yes", title: "Sube el CARTON CORRUGADO" },
        { ...base, id: "no", title: "Vietnam asume el papel de anfitrión de la APEC 2027" },
        { ...base, id: "partial", title: "Papel kraftiano" },
      ],
      groups,
    );
    expect(filterRelevantNews(items).map((item) => item.id)).toEqual(["yes"]);
  });
});

describe("sortByRelevance", () => {
  const groups = [
    { id: "operations", label: "Operaciones", terms: ["Yumbo"] },
    { id: "regulation", label: "Regulación", terms: ["Ley 2232"] },
    { id: "sector", label: "Sector", terms: ["celulosa"] },
    { id: "company", label: "Empresa", terms: ["Smurfit Westrock"] },
  ];
  const make = (id: string, title: string, publishedAt: string) => ({ ...base, id, title, publishedAt });

  it("orders company > sector > regulation > operations regardless of the order of the groups, then newest first", () => {
    const items = matchNewsItems(
      [
        make("ops", "Bloqueo en Yumbo", "2026-10-20T10:00:00.000Z"),
        make("reg", "Ley 2232 en debate", "2026-10-20T09:00:00.000Z"),
        make("sec-old", "Precio de la celulosa", "2026-10-10T09:00:00.000Z"),
        make("sec-new", "Celulosa sube", "2026-10-19T09:00:00.000Z"),
        make("co", "Smurfit Westrock anuncia", "2026-10-01T09:00:00.000Z"),
        make("none", "Sin relación", "2026-10-21T09:00:00.000Z"),
      ],
      groups,
    );
    expect(sortByRelevance(items).map((item) => item.id)).toEqual(["co", "sec-new", "sec-old", "reg", "ops", "none"]);
  });

  it("ranks an item by its best group and does not mutate the input", () => {
    const items = matchNewsItems([make("both", "Smurfit Westrock cierra en Yumbo", "2026-10-01T00:00:00.000Z"), make("sec", "Celulosa", "2026-10-02T00:00:00.000Z")], groups);
    const copy = [...items];
    expect(sortByRelevance(items).map((item) => item.id)).toEqual(["both", "sec"]);
    expect(items).toEqual(copy);
  });
});
