// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery, resetStores, trmRecord } from "@/features/entorno/test-utils";
import { useAlertsStore } from "@/stores/alerts.store";
import { PeriodoProvider } from "./periodo";

const fetchTrm = vi.fn();
const downloadCsv = vi.fn();
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("@/lib/csv", () => ({ exportarCsv: (...args: unknown[]) => downloadCsv(...args) }));

import { TrmView } from "./trm-view";

const renderTrm = () =>
  renderWithQuery(
    <PeriodoProvider>
      <TrmView />
    </PeriodoProvider>,
  );

describe("TrmView", () => {
  beforeEach(() => {
    resetStores();
    downloadCsv.mockReset();
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900"), trmRecord("2026-10-15", "3895")]);
  });
  afterEach(cleanup);

  it("shows today, the previous day and the series as one indicator strip and one chart", async () => {
    renderTrm();

    const strip = await screen.findByRole("region", { name: "Indicadores" });
    expect(within(strip).getByText(/^TRM hoy/)).toBeInTheDocument();
    expect(within(strip).getByText("Día anterior")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Serie" })).toHaveTextContent("Histórico de la TRM");
  });

  it("lists each day of the period as an event with its variation as a badge", async () => {
    renderTrm();

    const events = await screen.findByRole("region", { name: "Días y variaciones" });
    expect(within(events).getAllByRole("listitem")).toHaveLength(3);
    expect(within(events).getByText("+2,56 %")).toBeInTheDocument();
  });

  it("keeps only the atypical days with the filter and Limpiar brings them all back", async () => {
    renderTrm();
    const events = await screen.findByRole("region", { name: "Días y variaciones" });

    await userEvent.click(within(events).getByRole("checkbox", { name: /Solo variaciones/ }));
    expect(within(events).getAllByRole("listitem")).toHaveLength(1);

    await userEvent.click(within(events).getByRole("button", { name: "Limpiar" }));
    expect(within(events).getAllByRole("listitem")).toHaveLength(3);
  });

  it("saves a day as an aviso and takes it back", async () => {
    renderTrm();
    const events = await screen.findByRole("region", { name: "Días y variaciones" });

    const [save] = within(events).getAllByRole("button", { name: /Guardar en avisos/ });
    await userEvent.click(save);
    expect(useAlertsStore.getState().alerts).toHaveLength(1);

    await userEvent.click(within(events).getByRole("button", { name: /Quitar de avisos/ }));
    expect(useAlertsStore.getState().alerts).toHaveLength(0);
  });

  it("exports the visible days", async () => {
    renderTrm();
    await userEvent.click(await screen.findByRole("button", { name: /Exportar CSV/ }));

    expect(downloadCsv).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ fecha: expect.stringContaining("2026-10-19") })]), "trm.csv");
  });

  it("shows the loading shape and then an inline error with retry", async () => {
    fetchTrm.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderTrm();
    expect(screen.getByRole("status", { name: "Consultando la TRM en datos.gov.co" })).toBeInTheDocument();
    unmount();

    fetchTrm.mockRejectedValue(new Error("La TRM no respondió."));
    renderTrm();
    expect(await screen.findByText("La TRM no respondió.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
