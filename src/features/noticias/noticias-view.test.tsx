// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewsItem } from "@/core/domain/news";
import type { Result } from "@/core/domain/result";
import { fakeAdapter, fakeContainer, renderWithQuery, resetStores, secopOk, TEST_NOW } from "@/features/entorno/test-utils";
import type { NewsData } from "@/infrastructure/sources/rss/client-adapter";

const newsFetch = vi.fn();

vi.mock("@/features/entorno/container", () => ({
  getContainer: () => fakeContainer(vi.fn().mockResolvedValue(secopOk([])), { news: fakeAdapter("news-rss", newsFetch) }),
}));

import { NoticiasView } from "./noticias-view";

const provenance = (via: "rss" | "google-news", outlet: string) => ({
  sourceId: via === "rss" ? ("news-rss" as const) : ("google-news" as const),
  url: "https://example.test/x",
  fetchedAt: TEST_NOW,
  license: "Solo titular, medio, fecha y enlace (derechos del medio)",
  attribution: outlet,
});

const item = (id: string, title: string, outlet: string, publishedAt: string, via: "rss" | "google-news" = "rss"): NewsItem => ({
  id,
  title,
  url: `https://example.test/${id}`,
  outlet,
  publishedAt,
  via,
  matchedTerms: [],
  matches: [],
  provenance: provenance(via, outlet),
});

const ITEMS: NewsItem[] = [
  item("a", "Smurfit Westrock invierte en Yumbo", "Portafolio", "2026-10-19T15:00:00.000Z"),
  item("b", "El dólar cierra a la baja", "El Tiempo", "2026-10-18T15:00:00.000Z"),
  item("c", "Nuevas reglas de reciclaje de envases", "Valora Analitik", "2026-10-17T15:00:00.000Z", "google-news"),
  item("d", "Un titular sin nada que ver", "La República", "2026-10-16T15:00:00.000Z"),
];

const ok = (items: NewsItem[], feeds: NewsData["feeds"] = [{ id: "portafolio", outlet: "Portafolio", status: "ok", count: items.length }]): Result<{ data: NewsData; provenance: NewsItem["provenance"] }> => ({
  ok: true,
  value: { data: { items, feeds }, provenance: provenance("rss", "RSS de medios colombianos") },
});

describe("NoticiasView", () => {
  beforeEach(() => {
    resetStores();
    newsFetch.mockResolvedValue(ok(ITEMS));
  });
  afterEach(cleanup);

  it("lists headlines that mention the configured terms, with a safe external link, outlet, date and matched terms", async () => {
    renderWithQuery(<NoticiasView />);

    const link = await screen.findByRole("link", { name: /Smurfit Westrock invierte en Yumbo/ });
    expect(link).toHaveAttribute("href", "https://example.test/a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const row = link.closest("[data-slot=item]") as HTMLElement;
    expect(within(row).getByText(/Portafolio/)).toBeInTheDocument();
    expect(within(row).getByText(/19\/10\/2026/)).toBeInTheDocument();
    expect(within(row).getByText("Smurfit Westrock")).toBeInTheDocument();
    expect(within(row).getByText("Yumbo")).toBeInTheDocument();
    expect(screen.queryByText("Un titular sin nada que ver")).not.toBeInTheDocument();
  });

  it("labels Google News items 'vía Google News' and keeps the original outlet", async () => {
    renderWithQuery(<NoticiasView />);

    const row = (await screen.findByRole("link", { name: /Nuevas reglas de reciclaje/ })).closest("[data-slot=item]") as HTMLElement;
    expect(within(row).getByText("vía Google News")).toBeInTheDocument();
    expect(within(row).getByText(/Valora Analitik/)).toBeInTheDocument();
    const direct = (await screen.findByRole("link", { name: /Smurfit Westrock invierte/ })).closest("[data-slot=item]") as HTMLElement;
    expect(within(direct).queryByText("vía Google News")).not.toBeInTheDocument();
  });

  it("shows every headline when the 'only my terms' box is cleared", async () => {
    renderWithQuery(<NoticiasView />);

    fireEvent.click(await screen.findByRole("checkbox", { name: /Solo titulares con mis términos/ }));
    expect(await screen.findByText("Un titular sin nada que ver")).toBeInTheDocument();
  });

  it("shows loading, error with retry, empty and switched-off states", async () => {
    newsFetch.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderWithQuery(<NoticiasView />);
    expect(screen.getByRole("status", { name: "Consultando los medios" })).toBeInTheDocument();
    unmount();

    newsFetch.mockResolvedValue({ ok: false, error: { sourceId: "news-rss", kind: "network", message: "No se pudo conectar con las noticias." } });
    const second = renderWithQuery(<NoticiasView />);
    expect(await screen.findByText("No pudimos consultar Noticias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    second.unmount();

    newsFetch.mockResolvedValue(ok([]));
    const third = renderWithQuery(<NoticiasView />);
    expect(await screen.findByText("No hay titulares para mostrar")).toBeInTheDocument();
    third.unmount();

    newsFetch.mockResolvedValue({ ok: false, error: { sourceId: "news-rss", kind: "disabled", message: "Fuente desactivada." } });
    renderWithQuery(<NoticiasView />);
    expect(await screen.findByText("Fuente desactivada")).toBeInTheDocument();
  });

  it("names the feeds that failed while keeping the rest", async () => {
    newsFetch.mockResolvedValue(
      ok(ITEMS, [
        { id: "portafolio", outlet: "Portafolio", status: "ok", count: 3 },
        { id: "elcolombiano", outlet: "El Colombiano", status: "error", count: 0, message: "La fuente no respondió a tiempo." },
        { id: "google-news", outlet: "Google News", status: "disabled", count: 0, message: "Fuente desactivada." },
      ]),
    );
    renderWithQuery(<NoticiasView />);

    expect(await screen.findByText(/No pudimos leer: El Colombiano/)).toBeInTheDocument();
    expect(screen.getByText(/Fuente desactivada: Google News/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Smurfit Westrock invierte/ })).toBeInTheDocument();
  });

  it("shows the source, license and date of the data", async () => {
    renderWithQuery(<NoticiasView />);

    expect(await screen.findByText(/Solo titular, medio, fecha y enlace/)).toBeInTheDocument();
  });
});
