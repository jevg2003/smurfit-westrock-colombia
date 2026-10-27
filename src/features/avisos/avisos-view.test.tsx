// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeContract } from "@/core/rules/test-fixtures";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";
import { useAlertsStore } from "@/stores/alerts.store";
import { useWatchlistStore } from "@/stores/watchlist.store";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();
const downloadCsv = vi.fn();
let query = "";

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("@/lib/download", () => ({ downloadCsv: (...args: unknown[]) => downloadCsv(...args) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query), usePathname: () => "/resumen", useRouter: () => ({ push: vi.fn() }) }));

import { AvisosView } from "./avisos-view";

const savedDay = (day: string, state: "reviewed" | "dismissed") => {
  const store = useAlertsStore.getState();
  const signal = buildTrmDaySignal({ date: `${day}T00:00:00.000`, fetchedAt: "2026-10-20T12:00:00.000Z" });
  store.createFromSignal(signal);
  if (state === "reviewed") store.review(signal.id, "Cierre de mes");
  else store.dismiss(signal.id, "No aplica");
};

describe("AvisosView", () => {
  beforeEach(() => {
    resetStores();
    query = "";
    downloadCsv.mockReset();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when no rule fires", async () => {
    renderWithQuery(<AvisosView />);
    expect(await screen.findByText("No hay avisos para mostrar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeDisabled();
  });

  it("lists a TRM move as an aviso that cites the active threshold", async () => {
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    renderWithQuery(<AvisosView />);
    expect(await screen.findByText(/La TRM subió 2,56% el 2026-10-19/)).toBeInTheDocument();
  });

  it("shows new and reviewed avisos by default and hides the dismissed ones", async () => {
    savedDay("2026-10-01", "reviewed");
    savedDay("2026-10-02", "dismissed");
    renderWithQuery(<AvisosView />);
    expect(await screen.findByText("TRM del 2026-10-01")).toBeInTheDocument();
    expect(screen.queryByText("TRM del 2026-10-02")).not.toBeInTheDocument();
    expect(screen.getByText(/Los descartados no se muestran/)).toBeInTheDocument();
  });

  it("exports the visible avisos as CSV", async () => {
    const user = userEvent.setup();
    savedDay("2026-10-01", "reviewed");
    renderWithQuery(<AvisosView />);
    expect(await screen.findByText("Cierre de mes", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
    const [fileName, content] = downloadCsv.mock.calls[0] as [string, string];
    expect(fileName).toMatch(/^avisos-.*\.csv$/);
    expect(content).toContain("Cierre de mes");
  });

  it("keeps only the followed avisos when 'Solo lo que sigo' is on", async () => {
    const user = userEvent.setup();
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    useWatchlistStore.setState({ indicators: [], competitorNits: [], onlyFollowed: false });
    renderWithQuery(<AvisosView />);
    expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Solo lo que sigo" }));
    expect(screen.queryByText(/La TRM subió/)).not.toBeInTheDocument();
  });

  describe("with a ?pestel= param", () => {
    beforeEach(() => {
      secopFetch.mockResolvedValue(secopOk([makeContract({ endsAt: "2026-12-31T00:00:00.000-05:00" })]));
      fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    });

    it("keeps only the avisos of that PESTEL factor and links back to all", async () => {
      query = "pestel=political";
      renderWithQuery(<AvisosView />);
      expect(await screen.findByText(/Contrato con .* vence en/)).toBeInTheDocument();
      expect(screen.queryByText(/La TRM subió/)).not.toBeInTheDocument();
      expect(screen.getByText(/Mostrando solo el factor PESTEL/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ver todos los avisos" })).toHaveAttribute("href", "/resumen?tab=avisos");
    });

    it("ignores an unknown factor", async () => {
      query = "pestel=bogus";
      renderWithQuery(<AvisosView />);
      expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
      expect(screen.queryByText(/Mostrando solo el factor PESTEL/)).not.toBeInTheDocument();
    });
  });
});
