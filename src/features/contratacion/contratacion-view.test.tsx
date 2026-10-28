// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { mockViewport } from "@/components/layouts/viewport.test-utils";
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
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists the company contract with its expiry badge and opens the detail with the process link and provenance", async () => {
    mockViewport(1280);
    renderWithQuery(<ContratacionView />);

    expect(await screen.findByText("Elija un elemento de la lista")).toBeInTheDocument();
    expect(await screen.findByText("Vence en 72 días")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Industria Licorera del Cauca" }));

    const pane = screen.getByRole("region", { name: "Detalle del contrato" });
    expect(within(pane).getByRole("link", { name: /Abrir proceso/ })).toHaveAttribute("href", CONTRACT.processUrl);
    expect(within(pane).getByText(/Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos\.gov\.co · CC BY-SA 4\.0/)).toBeInTheDocument();
  });

  it("filters by vencimiento and clears the filter", async () => {
    renderWithQuery(<ContratacionView />);
    await screen.findByText("Vence en 72 días");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Vencimiento" }), "alert");
    expect(screen.queryByText("Vence en 72 días")).not.toBeInTheDocument();
    expect(screen.getByText("Ningún contrato cumple estos filtros")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.getByText("Vence en 72 días")).toBeInTheDocument();
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

  it("shows the contracts in pages of 30 with a Ver más button and keeps the CSV complete", async () => {
    const many = Array.from({ length: 70 }, (_, index): PublicContract => ({ ...CONTRACT, id: `CO1.PCCNTR.${index}`, entity: `Entidad ${index}`, signedAt: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000-05:00` }));
    secopFetch.mockResolvedValue(secopOk(many));
    renderWithQuery(<ContratacionView />);
    await screen.findAllByRole("button", { name: /Entidad/ });
    expect(screen.getAllByRole("listitem").filter((item) => /Entidad/.test(item.textContent ?? ""))).toHaveLength(30);
    expect(screen.getByText("Mostrando 30 de 70")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(screen.getAllByRole("listitem").filter((item) => /Entidad/.test(item.textContent ?? ""))).toHaveLength(60);
    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect((downloadCsv.mock.calls[0][1] as string).match(/Entidad/g)).toHaveLength(70);
  });
});
