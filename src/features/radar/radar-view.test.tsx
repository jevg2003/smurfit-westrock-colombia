// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { fakeContainer, renderWithQuery, resetStores, secopDown, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";
import { useCompaniesStore } from "@/stores/companies.store";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useAlertsStore } from "@/stores/alerts.store";
import { useWatchlistStore } from "@/stores/watchlist.store";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { RadarView } from "./radar-view";

describe("RadarView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3890")]);
  });
  afterEach(cleanup);

  it("shows the empty state when there are no new avisos", async () => {
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("No hay avisos nuevos")).toBeInTheDocument();
    expect(screen.getByText("Aún no ha revisado ningún aviso.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TRM hoy" })).toHaveAttribute("href", "/economia?tab=trm");
  });

  it("hides the contract cards for a company without NIT", async () => {
    const { nit: _nit, ...withoutNit } = TEST_COMPANY;
    useCompaniesStore.setState({ companies: [withoutNit], activeCompanyId: withoutNit.id });
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("TRM hoy")).toBeInTheDocument();
    expect(screen.queryByText("Contratos por vencer")).not.toBeInTheDocument();
    expect(screen.queryByText("Contratos de competidores")).not.toBeInTheDocument();
  });

  it("keeps working when SECOP fails and names the failing source", async () => {
    secopFetch.mockResolvedValue(secopDown);
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect(screen.getByText("SECOP II no respondió a tiempo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(await screen.findByText("TRM hoy")).toBeInTheDocument();
  });

  it("shows the loading skeleton before the sources answer", () => {
    fetchTrm.mockReturnValue(new Promise(() => {}));
    secopFetch.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<RadarView />);

    expect(screen.getByRole("status", { name: "Consultando las fuentes" })).toBeInTheDocument();
  });

  it("reviews an aviso from its row: it leaves the inbox and stays reviewed in the store", async () => {
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    renderWithQuery(<RadarView />);

    await userEvent.click(await screen.findByRole("button", { name: /^Revisar: La TRM subió/ }));

    expect(screen.queryByText(/La TRM subió/)).not.toBeInTheDocument();
    expect(useAlertsStore.getState().alerts.map((alert) => alert.state)).toEqual(["reviewed"]);
  });

  it("filters by tema from the summary and releases the filter with Limpiar", async () => {
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    renderWithQuery(<RadarView />);

    expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Macroeconomía/ }));
    expect(screen.getByRole("combobox", { name: "Tema" })).toHaveValue("macro");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tema" }), "procurement");
    expect(screen.queryByText(/La TRM subió/)).not.toBeInTheDocument();
    expect(screen.getByText("Ningún aviso cumple estos filtros")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
  });

  describe("watchlist filter (RF-15)", () => {
    const contract = (id: string, nit: string, name: string): PublicContract => ({
      id,
      entity: `Entidad ${id}`,
      supplierNit: nit,
      supplierName: name,
      value: 1000000,
      signedAt: "2026-10-10T00:00:00.000-05:00",
      status: "En ejecución",
      provenance: {
        sourceId: "secop",
        url: `https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=${id}`,
        fetchedAt: "2026-10-20T15:00:00.000Z",
        license: "CC BY-SA 4.0",
        attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
      },
    });

    beforeEach(() => {
      secopFetch.mockResolvedValue(
        secopOk([contract("A1", "900000002", "COMPETIDORA UNO"), contract("C1", "900000003", "CARVAJAL EMPAQUES")]),
      );
    });

    it("shows every new aviso until the toggle is on, then only the followed ones", async () => {
      useWatchlistStore.setState({ competitorNits: ["900000002"] });
      const user = userEvent.setup();
      renderWithQuery(<RadarView />);

      expect(await screen.findByText(/Competidora Uno firmó un contrato con Entidad A1/)).toBeInTheDocument();
      expect(screen.getByText(/Competidora Dos firmó un contrato con Entidad C1/)).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "Solo lo que sigo" }));

      expect(screen.getByText(/Competidora Uno firmó un contrato con Entidad A1/)).toBeInTheDocument();
      expect(screen.queryByText(/Competidora Dos firmó/)).not.toBeInTheDocument();
      expect(useWatchlistStore.getState().onlyFollowed).toBe(true);
    });

    it("explains an empty result caused by the filter", async () => {
      useWatchlistStore.setState({ competitorNits: [], indicators: [], onlyFollowed: true });
      renderWithQuery(<RadarView />);

      expect(await screen.findByText("Ningún aviso nuevo es de lo que sigue")).toBeInTheDocument();
    });
  });
});
