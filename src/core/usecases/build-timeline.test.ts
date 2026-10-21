import { describe, expect, it } from "vitest";
import type { NewsItem } from "../domain/news";
import type { RegulationEntry } from "../domain/regulation";
import { makeContract } from "../rules/test-fixtures";
import { buildTimeline } from "./build-timeline";
import { COMPETITORS, makeBriefingSignal } from "./test-data";

const provenance = {
  sourceId: "curated" as const,
  url: "https://example.test",
  fetchedAt: "2026-10-20T15:00:00.000Z",
  license: "n/a",
  attribution: "test",
};

const news: NewsItem = {
  id: "n1",
  title: "Titular",
  url: "https://news.test/1",
  outlet: "Medio",
  publishedAt: "2026-10-15T12:00:00.000Z",
  via: "rss",
  matchedTerms: ["papel"],
  matches: [{ groupId: "sector", term: "papel" }],
  provenance,
};

const regulation: RegulationEntry = {
  id: "r1",
  name: "Resolución 1407 de 2018",
  date: "2026-10-01T05:00:00.000Z",
  topic: "REP",
  whyItMatters: "Aplica a envases",
  url: "https://reg.test/1",
  reviewedAt: "2026-10-19T00:00:00.000Z",
  curated: true,
  provenance,
};

describe("buildTimeline", () => {
  const events = buildTimeline({
    signals: [makeBriefingSignal("s1", "2026-10-18T05:00:00.000Z", { dimension: "macro" })],
    contracts: [
      makeContract({ id: "own", signedAt: "2026-01-27T00:00:00.000-05:00" }),
      makeContract({ id: "comp", supplierNit: "860026759", signedAt: "2026-10-10T00:00:00.000-05:00" }),
    ],
    news: [news],
    regulations: [regulation],
    competitorNits: COMPETITORS.map((competitor) => competitor.nit),
  });

  it("merges every dimension, newest first", () => {
    expect(events.map((event) => event.id)).toEqual(["signal:s1", "news:n1", "contract:comp", "regulation:r1", "contract:own"]);
  });

  it("labels each event with its dimension", () => {
    const byId = Object.fromEntries(events.map((event) => [event.id, event.dimension]));
    expect(byId).toMatchObject({
      "signal:s1": "macro",
      "news:n1": "market",
      "contract:comp": "competitors",
      "contract:own": "procurement",
      "regulation:r1": "regulation",
    });
  });

  it("keeps the link and provenance of each event", () => {
    const contract = events.find((event) => event.id === "contract:own");
    expect(contract?.url).toBe("https://community.secop.gov.co/process/1");
    expect(contract?.provenance[0].sourceId).toBe("secop");
    expect(events.find((event) => event.id === "news:n1")?.url).toBe("https://news.test/1");
  });

  it("orders ties by id so the result is stable", () => {
    const tie = buildTimeline({
      signals: [makeBriefingSignal("b", "2026-10-18T05:00:00.000Z"), makeBriefingSignal("a", "2026-10-18T05:00:00.000Z")],
      contracts: [],
      news: [],
      regulations: [],
      competitorNits: [],
    });
    expect(tie.map((event) => event.id)).toEqual(["signal:a", "signal:b"]);
  });
});
