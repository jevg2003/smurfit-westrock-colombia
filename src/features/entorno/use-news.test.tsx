// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewsItem } from "@/core/domain/news";
import { fakeAdapter, fakeContainer, renderWithQuery, resetStores, secopOk, TEST_NOW } from "./test-utils";

const newsFetch = vi.fn();

vi.mock("@/features/entorno/container", () => ({
  getContainer: () => fakeContainer(vi.fn().mockResolvedValue(secopOk([])), { news: fakeAdapter("news-rss", newsFetch) }),
}));

import { useNews } from "./use-news";

const item = (id: string, title: string, publishedAt: string): NewsItem => ({
  id,
  title,
  url: `https://example.test/${id}`,
  outlet: "Portafolio",
  publishedAt,
  via: "rss",
  matchedTerms: [],
  matches: [],
  provenance: { sourceId: "news-rss", url: "https://example.test/x", fetchedAt: TEST_NOW, license: "n/a", attribution: "Portafolio" },
});

function Probe() {
  const news = useNews();
  if (news.view.status !== "ready") return <p>cargando</p>;
  return (
    <>
      <p data-testid="all">{news.items.map((entry) => entry.id).join(",")}</p>
      <p data-testid="relevant">{news.relevantItems.map((entry) => entry.id).join(",")}</p>
    </>
  );
}

describe("useNews relevance", () => {
  beforeEach(() => {
    resetStores();
    newsFetch.mockResolvedValue({
      ok: true,
      value: {
        data: {
          items: [
            item("noise", "Vietnam asume el papel de anfitrión de la APEC 2027", "2026-10-20T10:00:00.000Z"),
            item("ops", "Paro camionero en el Valle", "2026-10-19T10:00:00.000Z"),
            item("co", "Smurfit Westrock presenta resultados", "2026-10-10T10:00:00.000Z"),
          ],
          feeds: [],
        },
        provenance: { sourceId: "news-rss", url: "https://example.test/x", fetchedAt: TEST_NOW, license: "n/a", attribution: "x" },
      },
    });
  });
  afterEach(cleanup);

  it("exposes relevantItems without the headlines that match no term, ordered by relevance; items keeps all of them", async () => {
    renderWithQuery(<Probe />);

    expect((await screen.findByTestId("relevant")).textContent).toBe("co,ops");
    expect(screen.getByTestId("all").textContent).toBe("co,ops,noise");
  });
});

function ErrorProbe() {
  const news = useNews();
  return <p data-testid="kind">{news.view.status === "error" ? (news.view.errorKind ?? "none") : "cargando"}</p>;
}

describe("useNews failures", () => {
  beforeEach(() => resetStores());
  afterEach(cleanup);

  it("keeps the typed kind of an adapter error", async () => {
    newsFetch.mockResolvedValue({ ok: false, error: { sourceId: "news-rss", kind: "rate_limited", message: "Límite." } });
    renderWithQuery(<ErrorProbe />);
    await waitFor(() => expect(screen.getByTestId("kind").textContent).toBe("rate_limited"));
  });
});
