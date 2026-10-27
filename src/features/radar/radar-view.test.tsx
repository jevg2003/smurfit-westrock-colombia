// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { fakeContainer, renderWithQuery, resetStores, secopDown, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";
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

  it("shows the empty state when there are no new alerts", async () => {
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("No hay alertas nuevas")).toBeInTheDocument();
    expect(screen.getByText("Aún no has revisado ninguna alerta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Días y variaciones" })).toHaveAttribute("href", "/dias");
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

    it("shows every new alert until the toggle is on, then only the followed ones", async () => {
      useWatchlistStore.setState({ competitorNits: ["900000002"] });
      const user = userEvent.setup();
      renderWithQuery(<RadarView />);

      expect(await screen.findByText(/Competidora Uno firmó un contrato con Entidad A1/)).toBeInTheDocument();
      expect(screen.getByText(/Competidora Dos firmó un contrato con Entidad C1/)).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "Solo mis seguimientos" }));

      expect(screen.getByText(/Competidora Uno firmó un contrato con Entidad A1/)).toBeInTheDocument();
      expect(screen.queryByText(/Competidora Dos firmó/)).not.toBeInTheDocument();
      expect(useWatchlistStore.getState().onlyFollowed).toBe(true);
    });

    it("explains an empty result caused by the filter", async () => {
      useWatchlistStore.setState({ competitorNits: [], indicators: [], onlyFollowed: true });
      renderWithQuery(<RadarView />);

      expect(await screen.findByText("Ninguna alerta nueva es de lo que sigues")).toBeInTheDocument();
    });
  });
});
