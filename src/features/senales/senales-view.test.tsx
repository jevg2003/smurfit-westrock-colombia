// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { SenalesView } from "./senales-view";

describe("SenalesView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when no rule fires", async () => {
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText("No hay señales para mostrar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeDisabled();
  });

  it("lists a TRM move as a signal that cites the active threshold", async () => {
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/La TRM subió 2,56% el 2026-10-19/)).toBeInTheDocument();
  });

  it("lists a weekly move of the spot electricity price read from /api/energia", async () => {
    const days = Array.from({ length: 14 }, (_, index) => ({ date: `2026-10-${String(4 + index).padStart(2, "0")}`, value: index < 7 ? 100 : 140 }));
    const provenance = { url: "https://servapibi.xm.com.co/hourly", license: "sin licencia abierta declarada", attribution: "XM S.A. E.S.P.", fetchedAt: "2026-10-20T15:00:00.000Z" };
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok", unit: "COP/kWh", days, provenance })));
    vi.stubGlobal("fetch", fetchStub);
    window.fetch = fetchStub;
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/El precio de bolsa de energía subió 40,0% semana a semana/)).toBeInTheDocument();
    expect(fetchStub.mock.calls[0][0]).toBe("/api/energia?days=30");
  });
});
