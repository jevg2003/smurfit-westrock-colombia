// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyFinancials } from "@/core/domain/company";
import type { PublicContract } from "@/core/domain/contract";
import type { Provenance } from "@/core/domain/provenance";
import type { Result } from "@/core/domain/result";
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
  company("890300406", "CARTON DE COLOMBIA S.A.", 2025, 1.91, 0.18),
  company("890300406", "CARTON DE COLOMBIA S.A.", 2024, 1.78, 0.13),
  company("860026759", "CARTONES AMERICA S.A. CAME", 2025, 0.62, 0.08),
  company("890319047", "CARVAJAL EMPAQUES S.A.", 2025, 0.55, 0.04),
  company("890925108", "PAPELES Y CARTONES S.A.", 2025, 0.53, 0.02),
];

const financialsOk: Result<{ data: CompanyFinancials[]; provenance: Provenance }> = {
  ok: true,
  value: { data: FINANCIALS, provenance },
};

const CONTRACT: PublicContract = {
  id: "CO1.PCCNTR.100",
  entity: "Alcaldía de Cali",
  supplierNit: "860026759",
  supplierName: "CARTONES AMERICA S.A. CAME",
  value: 120000000,
  signedAt: "2026-10-01T00:00:00.000-05:00",
  status: "En ejecución",
  processUrl: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9",
  provenance: { ...provenance, sourceId: "secop", url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.100" },
};
const OWN_CONTRACT: PublicContract = { ...CONTRACT, id: "CO1.PCCNTR.200", entity: "Entidad propia", supplierNit: "890300406" };

describe("CompetidoresView", () => {
  beforeEach(() => {
    resetStores();
    supersociedadesFetch.mockResolvedValue(financialsOk);
    secopFetch.mockResolvedValue(secopOk([CONTRACT, OWN_CONTRACT]));
  });
  afterEach(cleanup);

  it("shows one card per company with revenue, net income, cutoff year and the unit note", async () => {
    renderWithQuery(<CompetidoresView />);

    const card = (await screen.findByRole("heading", { name: "Cartones América" })).closest("[data-slot=card]") as HTMLElement;
    expect(within(card).getByText("0,62")).toBeInTheDocument();
    expect(within(card).getByText("0,08")).toBeInTheDocument();
    expect(within(card).getByText(/Corte 2025/)).toBeInTheDocument();
    expect(within(card).getByText(/unidad no declarada por la fuente/)).toBeInTheDocument();
    expect(within(card).getByText(/Superintendencia de Sociedades vía datos\.gov\.co · CC BY-SA 4\.0/)).toBeInTheDocument();
    expect(screen.getAllByText(/Corte 2025/)).toHaveLength(4);
  });

  it("uses the latest cutoff year of the company and shows the net margin", async () => {
    renderWithQuery(<CompetidoresView />);

    const card = (await screen.findByText("Cartón de Colombia")).closest("[data-slot=card]") as HTMLElement;
    expect(within(card).getByText("1,91")).toBeInTheDocument();
    expect(within(card).queryByText("1,78")).not.toBeInTheDocument();
    expect(within(card).getByText(/9,4 %/)).toBeInTheDocument();
  });

  it("lists only the competitors' SECOP contracts in the grid, with the process link", async () => {
    renderWithQuery(<CompetidoresView />);

    expect(await screen.findByText("Alcaldía de Cali")).toBeInTheDocument();
    expect(screen.queryByText("Entidad propia")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir proceso/ })).toHaveAttribute("href", CONTRACT.processUrl);
  });

  it("keeps the cards when SECOP fails and names the failing source", async () => {
    secopFetch.mockResolvedValue(secopDown);
    renderWithQuery(<CompetidoresView />);

    expect(await screen.findByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect(await screen.findByText("Cartones América")).toBeInTheDocument();
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

    expect(await screen.findByText("Supersociedades no devolvió cifras para estas empresas")).toBeInTheDocument();
  });

  it("shows loading skeletons before the sources answer", () => {
    supersociedadesFetch.mockReturnValue(new Promise(() => {}));
    secopFetch.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<CompetidoresView />);

    expect(screen.getByRole("status", { name: "Consultando Supersociedades" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Consultando SECOP II en datos.gov.co" })).toBeInTheDocument();
  });
});
