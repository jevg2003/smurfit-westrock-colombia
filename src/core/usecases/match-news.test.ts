import { describe, expect, it } from "vitest";
import type { NewsItem } from "../domain/news";
import { filterRelevantNews, matchNewsItems, sortByRelevance } from "./match-news";

const base: NewsItem = {
  id: "n1",
  title: "Empresa Ejemplo apuesta por el reciclaje de papel",
  url: "https://example.test/1",
  outlet: "Portafolio",
  publishedAt: "2026-10-19T10:00:00.000Z",
  via: "rss",
  matchedTerms: [],
  matches: [],
  provenance: { sourceId: "news-rss", url: "https://example.test/1", fetchedAt: "2026-10-20T00:00:00.000Z", license: "n/a", attribution: "Portafolio" },
};

const GROUPS = [
  { id: "company", label: "Empresa", terms: ["Empresa Ejemplo"] },
  { id: "sector", label: "Sector", terms: ["papel"] },
  { id: "regulation", label: "Regulación", terms: ["reciclaje"] },
];

describe("matchNewsItems", () => {
  it("fills matches and matchedTerms from the current term groups, without mutating the input", () => {
    const [item] = matchNewsItems([base], GROUPS);
    expect(item.matches).toEqual([
      { groupId: "company", term: "Empresa Ejemplo" },
      { groupId: "sector", term: "papel" },
      { groupId: "regulation", term: "reciclaje" },
    ]);
    expect(item.matchedTerms).toEqual(["Empresa Ejemplo", "papel", "reciclaje"]);
    expect(base.matches).toEqual([]);
  });

  it("returns items with no match as they are (empty matches)", () => {
    const [item] = matchNewsItems([{ ...base, title: "Nada que ver" }], GROUPS);
    expect(item.matches).toEqual([]);
  });
});

describe("filterRelevantNews", () => {
  it("keeps only items that match at least one term, accent-insensitively and on whole words", () => {
    const groups = [{ id: "sector", label: "Sector", terms: ["acero laminado", "alambre galvanizado"] }];
    const items = matchNewsItems(
      [
        { ...base, id: "yes", title: "Sube el ACERO LAMINADO" },
        { ...base, id: "no", title: "Vietnam asume el papel de anfitrión de la APEC 2027" },
        { ...base, id: "partial", title: "Alambre galvanizadoiano" },
      ],
      groups,
    );
    expect(filterRelevantNews(items).map((item) => item.id)).toEqual(["yes"]);
  });
});

describe("sortByRelevance", () => {
  const groups = [
    { id: "operations", label: "Operaciones", terms: ["Itagüí"] },
    { id: "regulation", label: "Regulación", terms: ["Ley 2232"] },
    { id: "sector", label: "Sector", terms: ["celulosa"] },
    { id: "company", label: "Empresa", terms: ["Empresa Ejemplo"] },
  ];
  const make = (id: string, title: string, publishedAt: string) => ({ ...base, id, title, publishedAt });

  it("orders company > sector > regulation > operations regardless of the order of the groups, then newest first", () => {
    const items = matchNewsItems(
      [
        make("ops", "Bloqueo en Itagüí", "2026-10-20T10:00:00.000Z"),
        make("reg", "Ley 2232 en debate", "2026-10-20T09:00:00.000Z"),
        make("sec-old", "Precio de la celulosa", "2026-10-10T09:00:00.000Z"),
        make("sec-new", "Celulosa sube", "2026-10-19T09:00:00.000Z"),
        make("co", "Empresa Ejemplo anuncia", "2026-10-01T09:00:00.000Z"),
        make("none", "Sin relación", "2026-10-21T09:00:00.000Z"),
      ],
      groups,
    );
    expect(sortByRelevance(items).map((item) => item.id)).toEqual(["co", "sec-new", "sec-old", "reg", "ops", "none"]);
  });

  it("ranks an item by its best group and does not mutate the input", () => {
    const items = matchNewsItems([make("both", "Empresa Ejemplo cierra en Itagüí", "2026-10-01T00:00:00.000Z"), make("sec", "Celulosa", "2026-10-02T00:00:00.000Z")], groups);
    const copy = [...items];
    expect(sortByRelevance(items).map((item) => item.id)).toEqual(["both", "sec"]);
    expect(items).toEqual(copy);
  });
});

describe("sortByRelevance with Colombian outlets", () => {
  const groups = [
    { id: "company", label: "Empresa", terms: ["Empresa Ejemplo"] },
    { id: "sector", label: "Sector", terms: ["celulosa"] },
  ];
  const outlets = ["Portafolio", "Portafolio.co", "El Tiempo"];
  const make = (id: string, title: string, outlet: string, publishedAt: string) => ({ ...base, id, title, outlet, publishedAt });

  it("puts a Colombian outlet first inside the same group, even if older", () => {
    const items = matchNewsItems(
      [
        make("foreign-new", "Empresa Ejemplo anuncia", "Heraldo", "2026-10-20T10:00:00.000Z"),
        make("co-old", "Empresa Ejemplo anuncia", "portafolio.co", "2026-10-10T10:00:00.000Z"),
        make("co-new", "Empresa Ejemplo anuncia", "El Tiempo", "2026-10-15T10:00:00.000Z"),
      ],
      groups,
    );
    expect(sortByRelevance(items, outlets).map((item) => item.id)).toEqual(["co-new", "co-old", "foreign-new"]);
  });

  it("never lets the outlet beat the group", () => {
    const items = matchNewsItems(
      [make("sector-co", "Sube la celulosa", "Portafolio", "2026-10-20T10:00:00.000Z"), make("company-foreign", "Empresa Ejemplo anuncia", "Heraldo", "2026-10-01T10:00:00.000Z")],
      groups,
    );
    expect(sortByRelevance(items, outlets).map((item) => item.id)).toEqual(["company-foreign", "sector-co"]);
  });

  it("does not match an outlet by a partial name", () => {
    const items = matchNewsItems([make("a", "Empresa Ejemplo", "Portafolio Madrid", "2026-10-01T10:00:00.000Z"), make("b", "Empresa Ejemplo", "Heraldo", "2026-10-02T10:00:00.000Z")], groups);
    expect(sortByRelevance(items, outlets).map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("matchNewsItems with Colombian outlets", () => {
  const groups = [{ id: "company", label: "Empresa", terms: [{ term: "Empresa Ejemplo", requireAny: ["Colombia"] }], excludeAny: ["fútbol"] }];
  const outlets = ["El Tiempo", "Portafolio.co"];
  const make = (id: string, title: string, outlet: string) => ({ ...base, id, title, outlet });

  it("lets a Colombian outlet stand in for the context words, ignoring case and accents", () => {
    const items = matchNewsItems(
      [make("a", "Empresa Ejemplo compra negocio en Chile", "el tiempo"), make("b", "Empresa Ejemplo compra negocio en Chile", "Heraldo"), make("c", "Empresa Ejemplo compra negocio en Chile", "Portafolio.co")],
      groups,
      outlets,
    );
    expect(filterRelevantNews(items).map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("still drops excluded words from Colombian outlets", () => {
    const items = matchNewsItems([make("a", "Fútbol: Empresa Ejemplo patrocina", "El Tiempo")], groups, outlets);
    expect(filterRelevantNews(items)).toEqual([]);
  });
});
