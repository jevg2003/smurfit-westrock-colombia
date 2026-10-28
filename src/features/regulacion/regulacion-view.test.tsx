// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Provenance } from "@/core/domain/provenance";
import type { RegulationEntry, RegulationItem } from "@/core/domain/regulation";
import type { Result } from "@/core/domain/result";
import { fakeAdapter, fakeContainer, renderWithQuery, resetStores, secopOk, TEST_NOW } from "@/features/entorno/test-utils";
import type { RegulationFeedData } from "@/infrastructure/sources/regulation/client-adapter";

const regulationFetch = vi.fn();
const curated = vi.hoisted(() => ({ norms: [] as RegulationEntry[] }));

// The shipped list of curated norms is empty: each test sets the norms it needs.
vi.mock("@/infrastructure/sources/curated/norms", () => ({ loadCuratedNorms: () => curated.norms }));

vi.mock("@/features/entorno/container", () => ({
  getContainer: () => fakeContainer(vi.fn().mockResolvedValue(secopOk([])), { regulation: fakeAdapter("minambiente", regulationFetch) }),
}));

import { RegulacionView } from "./regulacion-view";

const prov = (sourceId: "minambiente" | "presidencia"): Provenance => ({
  sourceId,
  url: "https://example.test/src",
  fetchedAt: TEST_NOW,
  license: sourceId === "presidencia" ? "CC BY-SA 4.0" : "Solo titular, fecha y enlace (derechos del Ministerio)",
  attribution: sourceId === "presidencia" ? "DAPRE vía datos.gov.co" : "Ministerio de Ambiente y Desarrollo Sostenible",
});

const POST: RegulationItem = {
  id: "minambiente:1",
  kind: "minambiente",
  title: "Colombia y Armenia lanzan una coalición",
  url: "https://www.minambiente.gov.co/coalicion/",
  publishedAt: "2026-10-16T14:46:16.000Z",
  provenance: prov("minambiente"),
};
const DECREE: RegulationItem = {
  id: "decree:1",
  kind: "decree",
  title: "DECRETO No. 0970 DEL 4 DE AGOSTO DE 2026",
  summary: "Por el cual se adiciona el Capítulo 15 al Título 8 sobre residuos",
  url: "https://dapre.presidencia.gov.co/d.pdf",
  publishedAt: "2026-08-04T15:00:00.000Z",
  provenance: prov("presidencia"),
};

const NORM: RegulationEntry = {
  id: "ley-ejemplo",
  name: "Ley de ejemplo",
  date: "2024-01-01",
  topic: "Tema de ejemplo",
  whyItMatters: "Explica por qué importa a la empresa.",
  url: "https://www.example.test/ley",
  reviewedAt: "2026-10-20",
  curated: true,
  provenance: { sourceId: "curated", url: "https://www.example.test/ley", fetchedAt: "2026-10-20T00:00:00.000Z", license: "Resumen propio", attribution: "Curado manualmente", curated: true },
};

const ok = (data: RegulationFeedData): Result<{ data: RegulationFeedData; provenance: Provenance }> => ({
  ok: true,
  value: { data, provenance: prov("minambiente") },
});
const BOTH = ok({ minambiente: { status: "ok", items: [POST] }, presidencia: { status: "ok", items: [DECREE] } });

describe("RegulacionView", () => {
  beforeEach(() => {
    resetStores();
    curated.norms = [NORM];
    regulationFetch.mockResolvedValue(BOTH);
  });
  afterEach(cleanup);

  it("shows a curated norm with the 'curado manualmente' badge, review date and official link", async () => {
    renderWithQuery(<RegulacionView />);

    const norm = (await screen.findByText("Ley de ejemplo")).closest("li") as HTMLElement;
    expect(within(norm).getByText("Curado manualmente")).toBeInTheDocument();
    expect(within(norm).getByText(/Revisada el 20\/10\/2026/)).toBeInTheDocument();
    const link = within(norm).getByRole("link", { name: /Ley de ejemplo/ });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("gives each row a leading icon for its origin", async () => {
    renderWithQuery(<RegulacionView />);

    const decree = (await screen.findByRole("link", { name: /DECRETO No\. 0970/ })).closest("li") as HTMLElement;
    expect(decree.querySelector('[data-slot="event-media"] svg')).not.toBeNull();
  });

  it("gives each origin in the summary a leading icon", async () => {
    renderWithQuery(<RegulacionView />);

    await screen.findByRole("link", { name: /DECRETO No\. 0970/ });
    const button = screen.getAllByRole("button", { name: /Decretos de Presidencia/ }).find((el) => el.hasAttribute("aria-pressed")) as HTMLElement;
    expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });

  it("hides the curated section when the company has no curated norms", async () => {
    curated.norms = [];
    renderWithQuery(<RegulacionView />);

    await screen.findByRole("link", { name: /DECRETO No\. 0970/ });
    expect(screen.queryByText("Ley de ejemplo")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Normas curadas" })).not.toBeInTheDocument();
  });

  it("lists Minambiente posts and decrees with safe links and their sources", async () => {
    renderWithQuery(<RegulacionView />);

    const post = await screen.findByRole("link", { name: /Colombia y Armenia lanzan una coalición/ });
    expect(post).toHaveAttribute("href", POST.url);
    expect(post).toHaveAttribute("rel", "noopener noreferrer");
    const decree = screen.getByRole("link", { name: /DECRETO No\. 0970/ });
    expect(decree).toHaveAttribute("href", DECREE.url);
    expect(screen.getByText(/Título 8 sobre residuos/)).toBeInTheDocument();
    expect(screen.getByText(/\(DAPRE\) vía datos\.gov\.co · CC BY-SA 4\.0/)).toBeInTheDocument();
  });

  it("keeps the curated norms and the other source when one source fails", async () => {
    regulationFetch.mockResolvedValue(
      ok({ minambiente: { status: "error", items: [], httpStatus: 503, message: "La fuente respondió con el estado 503." }, presidencia: { status: "ok", items: [DECREE] } }),
    );
    renderWithQuery(<RegulacionView />);

    expect(await screen.findByText("No pudimos consultar Minambiente")).toBeInTheDocument();
    expect(screen.getByText("La fuente respondió con el estado 503.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DECRETO No\. 0970/ })).toBeInTheDocument();
    expect(screen.getByText("Ley de ejemplo")).toBeInTheDocument();
  });

  it("shows 'fuente desactivada' for a switched-off source", async () => {
    regulationFetch.mockResolvedValue(ok({ minambiente: { status: "disabled", items: [] }, presidencia: { status: "ok", items: [DECREE] } }));
    renderWithQuery(<RegulacionView />);

    expect(await screen.findByText("Fuente desactivada: Minambiente")).toBeInTheDocument();
  });

  it("filters by source and clears the filter", async () => {
    renderWithQuery(<RegulacionView />);
    await screen.findByRole("link", { name: /DECRETO No\. 0970/ });

    fireEvent.change(screen.getByRole("combobox", { name: "Fuente" }), { target: { value: "minambiente" } });
    expect(screen.queryByRole("link", { name: /DECRETO No\. 0970/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Colombia y Armenia/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.getByRole("link", { name: /DECRETO No\. 0970/ })).toBeInTheDocument();
  });

  it("shows empty states when a source has no items", async () => {
    curated.norms = [];
    regulationFetch.mockResolvedValue(ok({ minambiente: { status: "ok", items: [] }, presidencia: { status: "ok", items: [] } }));
    renderWithQuery(<RegulacionView />);

    expect(await screen.findByText("No hay publicaciones recientes")).toBeInTheDocument();
  });

  it("shows a loading state and a whole-call error with retry, and still shows the curated norms", async () => {
    regulationFetch.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderWithQuery(<RegulacionView />);
    expect(screen.getByRole("status", { name: "Consultando Minambiente y Presidencia" })).toBeInTheDocument();
    expect(screen.getByText("Ley de ejemplo")).toBeInTheDocument();
    unmount();

    regulationFetch.mockResolvedValue({ ok: false, error: { sourceId: "minambiente", kind: "network", message: "No se pudo conectar con la regulación." } });
    renderWithQuery(<RegulacionView />);
    expect(await screen.findByText("No pudimos consultar Regulación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
