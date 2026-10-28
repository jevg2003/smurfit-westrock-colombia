// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyFinancials } from "@/core/domain/company";
import type { PublicContract } from "@/core/domain/contract";
import type { Provenance } from "@/core/domain/provenance";
import type { Result } from "@/core/domain/result";
import { mockViewport } from "@/components/layouts/viewport.test-utils";
import { fakeAdapter, fakeContainer, renderWithQuery, resetStores, secopDown, secopOk, TEST_NOW } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const supersociedadesFetch = vi.fn();

vi.mock("@/features/entorno/container", () => ({
  getContainer: () =>
    fakeContainer(secopFetch, { supersociedades: fakeAdapter("supersociedades", supersociedadesFetch) }),
}));

import { CompetidoresView } from "./competidores-view";

const UNIT_NOTE = "unidad no declarada por la fuente (la descripción del dataset indica billones de pesos)";

const provenance: Provenance = {
  sourceId: "supersociedades",
  url: "https://www.datos.gov.co/resource/6cat-2gcs.json",
  fetchedAt: TEST_NOW,
  license: "CC BY-SA 4.0",
  attribution: "Superintendencia de Sociedades vía datos.gov.co",
};

const company = (nit: string, name: string, cutoffYear: number, revenue: number, netIncome: number): CompanyFinancials => ({
  nit,
  name,
  city: "CALI",
  cutoffYear,
  revenue,
  netIncome,
  unitNote: UNIT_NOTE,
  provenance,
});

const FINANCIALS: CompanyFinancials[] = [
  company("900000001", "EMPRESA EJEMPLO S.A.", 2025, 1.91, 0.18),
  company("900000001", "EMPRESA EJEMPLO S.A.", 2024, 1.78, 0.13),
  company("900000002", "COMPETIDORA UNO S.A.", 2025, 0.62, 0.08),
  company("900000003", "COMPETIDORA DOS S.A.", 2025, 0.55, 0.04),
  company("900000004", "COMPETIDORA TRES S.A.", 2025, 0.53, 0.02),
];

const financialsOk: Result<{ data: CompanyFinancials[]; provenance: Provenance }> = {
  ok: true,
  value: { data: FINANCIALS, provenance },
};

const CONTRACT: PublicContract = {
  id: "CO1.PCCNTR.100",
  entity: "Alcaldía de Cali",
  supplierNit: "900000002",
  supplierName: "COMPETIDORA UNO S.A.",
  value: 120000000,
  signedAt: "2026-10-01T00:00:00.000-05:00",
  status: "En ejecución",
  processUrl: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9",
  provenance: { ...provenance, sourceId: "secop", url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.100" },
};
const OWN_CONTRACT: PublicContract = { ...CONTRACT, id: "CO1.PCCNTR.200", entity: "Entidad propia", supplierNit: "900000001" };

describe("CompetidoresView", () => {
  beforeEach(() => {
    mockViewport(1280);
    resetStores();
    supersociedadesFetch.mockResolvedValue(financialsOk);
    secopFetch.mockResolvedValue(secopOk([CONTRACT, OWN_CONTRACT]));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists the company and every competitor; the first competitor is shown with revenue, net income, cutoff year and the unit note", async () => {
    renderWithQuery(<CompetidoresView />);

    const list = await screen.findByRole("list", { name: "Empresas" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    const pane = screen.getByRole("region", { name: "Detalle de la empresa" });
    expect(within(pane).getByRole("heading", { name: "Competidora Uno" })).toBeInTheDocument();
    expect(within(pane).getByText("0,62")).toBeInTheDocument();
    expect(within(pane).getByText("0,08")).toBeInTheDocument();
    expect(within(pane).getByText(/Corte 2025/)).toBeInTheDocument();
    expect(within(pane).getByText(/unidad no declarada por la fuente/)).toBeInTheDocument();
    expect(within(pane).getByText(/Superintendencia de Sociedades vía datos\.gov\.co · CC BY-SA 4\.0/)).toBeInTheDocument();
  });

  it("marks the company and each competitor with a different decorative icon", async () => {
    renderWithQuery(<CompetidoresView />);

    const list = await screen.findByRole("list", { name: "Empresas" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0].querySelector('[data-slot="row-media"] svg.lucide-building')).not.toBeNull();
    expect(rows[1].querySelector('[data-slot="row-media"] svg.lucide-swords')).not.toBeNull();
  });

  it("uses the latest cutoff year of the company and shows the net margin", async () => {
    renderWithQuery(<CompetidoresView />);

    await userEvent.click(await screen.findByRole("button", { name: /Empresa Ejemplo/ }));
    const pane = screen.getByRole("region", { name: "Detalle de la empresa" });
    expect(within(pane).getByText("1,91")).toBeInTheDocument();
    expect(within(pane).queryByText("1,78")).not.toBeInTheDocument();
    expect(within(pane).getByText(/9,4 %/)).toBeInTheDocument();
  });

  it("shows only the contracts of the selected company, with the process link", async () => {
    renderWithQuery(<CompetidoresView />);

    const pane = await screen.findByRole("region", { name: "Detalle de la empresa" });
    expect(await within(pane).findByText("Alcaldía de Cali")).toBeInTheDocument();
    expect(within(pane).getByRole("link", { name: /Alcaldía de Cali/ })).toHaveAttribute("href", CONTRACT.processUrl);

    await userEvent.click(screen.getByRole("button", { name: /Empresa Ejemplo/ }));
    expect(within(pane).queryByText("Alcaldía de Cali")).not.toBeInTheDocument();
    expect(within(pane).queryByText("Entidad propia")).not.toBeInTheDocument();
    expect(within(pane).getByText("SECOP II no devolvió contratos de esta empresa.")).toBeInTheDocument();
  });

  it("keeps the cards when SECOP fails and names the failing source", async () => {
    secopFetch.mockResolvedValue(secopDown);
    renderWithQuery(<CompetidoresView />);

    expect(await screen.findByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect((await screen.findAllByText("Competidora Uno")).length).toBeGreaterThan(0);
  });

  it("names Supersociedades when it fails and keeps the contracts", async () => {
    supersociedadesFetch.mockResolvedValue({
      ok: false,
      error: { sourceId: "supersociedades", kind: "network", message: "Supersociedades no respondió a tiempo." },
    });
    renderWithQuery(<CompetidoresView />);

    expect(await screen.findByText("No pudimos consultar Supersociedades")).toBeInTheDocument();
    expect(await screen.findByText("Alcaldía de Cali")).toBeInTheDocument();
  });

  it("shows an empty state when Supersociedades has no figures", async () => {
    supersociedadesFetch.mockResolvedValue({ ok: false, error: { sourceId: "supersociedades", kind: "empty", message: "vacío" } });
    renderWithQuery(<CompetidoresView />);

    expect(await screen.findByText(/Supersociedades no devolvió cifras para estas empresas/)).toBeInTheDocument();
  });

  it("shows loading skeletons before the sources answer", () => {
    supersociedadesFetch.mockReturnValue(new Promise(() => {}));
    secopFetch.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<CompetidoresView />);

    expect(screen.getByRole("status", { name: "Consultando Supersociedades" })).toBeInTheDocument();
  });
});
