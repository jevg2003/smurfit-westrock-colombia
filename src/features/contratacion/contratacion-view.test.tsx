// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { fakeContainer, renderWithQuery, resetStores, secopDown, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();
const downloadCsv = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("@/lib/download", () => ({ downloadCsv: (...args: unknown[]) => downloadCsv(...args) }));

import { ContratacionView } from "./contratacion-view";

const CONTRACT: PublicContract = {
  id: "CO1.PCCNTR.9151243",
  entity: "Industria Licorera del Cauca",
  supplierNit: "900000001",
  supplierName: "Empresa Ejemplo",
  value: 807534110,
  signedAt: "2026-01-27T00:00:00.000-05:00",
  endsAt: "2026-12-31T00:00:00.000-05:00",
  status: "En ejecución",
  processUrl: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1",
  provenance: {
    sourceId: "secop",
    url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.9151243",
    fetchedAt: "2026-10-20T15:00:00.000Z",
    license: "CC BY-SA 4.0",
    attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
  },
};

describe("ContratacionView", () => {
  beforeEach(() => {
    resetStores();
    downloadCsv.mockReset();
    secopFetch.mockResolvedValue(secopOk([CONTRACT]));
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900")]);
  });
  afterEach(cleanup);

  it("lists the company contract with its expiry badge, process link and provenance footer", async () => {
    renderWithQuery(<ContratacionView />);

    expect(await screen.findByText("Industria Licorera del Cauca")).toBeInTheDocument();
    expect(screen.getByText("Vence en 72 días")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir proceso/ })).toHaveAttribute("href", CONTRACT.processUrl);
    expect(
      screen.getByText(/Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos\.gov\.co · CC BY-SA 4\.0/),
    ).toBeInTheDocument();
  });

  it("exports the table to CSV", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ContratacionView />);

    await user.click(await screen.findByRole("button", { name: /Exportar CSV/ }));

    const [fileName, content] = downloadCsv.mock.calls[0] as [string, string];
    expect(fileName).toMatch(/^contratos-.*\.csv$/);
    expect(content).toContain("CO1.PCCNTR.9151243");
  });

  it("shows the empty state when SECOP has no contracts", async () => {
    secopFetch.mockResolvedValue(secopEmpty);
    renderWithQuery(<ContratacionView />);

    expect(await screen.findByText("No hay contratos en los últimos 12 meses para este NIT")).toBeInTheDocument();
  });

  it("shows a source error with a retry button", async () => {
    secopFetch.mockResolvedValue(secopDown);
    renderWithQuery(<ContratacionView />);

    expect(await screen.findByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
