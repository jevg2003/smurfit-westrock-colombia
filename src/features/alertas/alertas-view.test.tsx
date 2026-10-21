// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, trmRecord } from "@/features/entorno/test-utils";
import { useAlertsStore } from "@/stores/alerts.store";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();
const downloadCsv = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("@/lib/download", () => ({ downloadCsv: (...args: unknown[]) => downloadCsv(...args) }));

import { AlertasView } from "./alertas-view";

describe("AlertasView", () => {
  beforeEach(() => {
    resetStores();
    downloadCsv.mockReset();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when there are no alerts", async () => {
    renderWithQuery(<AlertasView />);

    expect(await screen.findByText("Todavía no hay alertas")).toBeInTheDocument();
  });

  it("keeps a saved TRM day visible as a reviewed alert and exports it with a BOM-ready CSV", async () => {
    const user = userEvent.setup();
    const { createFromSignal, review } = useAlertsStore.getState();
    createFromSignal(buildTrmDaySignal({ date: "2026-10-01T00:00:00.000", fetchedAt: "2026-10-20T12:00:00.000Z" }));
    review("trm.daily-move.v1:trm:2026-10-01T00:00:00.000", "Cierre de mes");

    renderWithQuery(<AlertasView />);

    expect(await screen.findByText("TRM del 2026-10-01")).toBeInTheDocument();
    expect(screen.getByText("Revisada")).toBeInTheDocument();
    expect(screen.getByText(/Cierre de mes/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, content] = downloadCsv.mock.calls[0] as [string, string];
    expect(fileName).toMatch(/^alertas-.*\.csv$/);
    expect(content).toContain("TRM del 2026-10-01");
    expect(content).toContain("Cierre de mes");
  });
});
