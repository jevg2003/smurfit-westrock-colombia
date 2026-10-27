// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";
import { useWatchlistStore } from "@/stores/watchlist.store";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { TimelineView } from "./timeline-view";

describe("TimelineView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when there are no events", async () => {
    renderWithQuery(<TimelineView />);

    expect(await screen.findByText("No hay eventos para mostrar")).toBeInTheDocument();
  });

  it("lists events newest first", async () => {
    fetchTrm.mockResolvedValue([
      trmRecord("2026-10-19", "4000"),
      trmRecord("2026-10-16", "3900"),
      trmRecord("2026-10-15", "3800"),
    ]);
    renderWithQuery(<TimelineView />);

    const items = await screen.findAllByText(/La TRM (subió|bajó)/);
    expect(items[0]).toHaveTextContent("2026-10-19");
  });

  it("filters events to what the user follows (RF-15)", async () => {
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
    secopFetch.mockResolvedValue(secopOk([contract("A1", "900000002", "COMPETIDORA UNO"), contract("C1", "900000003", "CARVAJAL EMPAQUES")]));
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    useWatchlistStore.setState({ competitorNits: ["900000002"], indicators: [] });
    const user = userEvent.setup();
    renderWithQuery(<TimelineView />);

    expect(await screen.findByText(/CARVAJAL EMPAQUES firmó un contrato con Entidad C1/)).toBeInTheDocument();
    expect(screen.getAllByText(/La TRM (subió|bajó)/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("checkbox", { name: "Solo mis seguimientos" }));

    expect(screen.getByText(/COMPETIDORA UNO firmó un contrato con Entidad A1/)).toBeInTheDocument();
    expect(screen.queryByText(/CARVAJAL EMPAQUES firmó/)).not.toBeInTheDocument();
    expect(screen.queryByText(/La TRM (subió|bajó)/)).not.toBeInTheDocument();
  });
});
