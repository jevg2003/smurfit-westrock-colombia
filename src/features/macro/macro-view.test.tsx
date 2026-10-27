// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Observation } from "@/core/domain/observation";
import type { Provenance, SourceId } from "@/core/domain/provenance";
import type { Result } from "@/core/domain/result";
import { fakeAdapter, fakeContainer, renderWithQuery, resetStores, secopEmpty, trmRecord, TEST_NOW } from "@/features/entorno/test-utils";
import { PeriodoProvider } from "@/features/trm/periodo";

const worldBankFetch = vi.fn();
const exportsFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({
  getContainer: () =>
    fakeContainer(() => Promise.resolve(secopEmpty), {
      worldBank: fakeAdapter("world-bank", worldBankFetch),
      exports: fakeAdapter("exports", exportsFetch),
    }),
}));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { MacroView } from "./macro-view";

const provenance = (sourceId: SourceId, license: string, attribution: string): Provenance => ({
  sourceId,
  url: `https://example.test/${sourceId}`,
  fetchedAt: TEST_NOW,
  license,
  attribution,
});

const wb = provenance("world-bank", "CC BY 4.0", "Banco Mundial – World Development Indicators");
const ex = provenance("exports", "CC BY-SA 4.0", "Ministerio de Comercio, Industria y Turismo - MinCIT vía datos.gov.co");

const obs = (indicatorId: Observation["indicatorId"], date: string, value: number, p: Provenance, unit = "%"): Observation => ({
  indicatorId,
  date,
  value,
  unit,
  provenance: p,
});

const ok = (data: Observation[], p: Provenance): Result<{ data: Observation[]; provenance: Provenance }> => ({
  ok: true,
  value: { data, provenance: p },
});

const down = (sourceId: SourceId, message: string): Result<never> => ({ ok: false, error: { sourceId, kind: "network", message } });

function wbAnswer({ indicator }: { indicator: string }) {
  return Promise.resolve(
    indicator === "pib"
      ? ok([obs("pib", "2024", 1.49, wb), obs("pib", "2025", 2.64, wb)], wb)
      : ok([obs("ipc_anual", "2024", 6.61, wb), obs("ipc_anual", "2025", 5.14, wb)], wb),
  );
}

const exportsOk = ok(
  [
    obs("exportaciones", "2026-03-31", 6479, ex, "millones de USD (unidad no declarada por la fuente)"),
    obs("exportaciones", "2026-06-30", 6234, ex, "millones de USD (unidad no declarada por la fuente)"),
  ],
  ex,
);

const renderMacro = () =>
  renderWithQuery(
    <PeriodoProvider>
      <MacroView />
    </PeriodoProvider>,
  );

describe("MacroView", () => {
  beforeEach(() => {
    resetStores();
    worldBankFetch.mockImplementation(wbAnswer);
    exportsFetch.mockResolvedValue(exportsOk);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3890")]);
  });
  afterEach(cleanup);

  it("shows GDP, CPI and exports in the strip with their year; the active one shows source and license", async () => {
    renderMacro();

    const strip = await screen.findByRole("region", { name: "Indicadores" });
    expect(await within(strip).findByText("2,64 %")).toBeInTheDocument();
    expect(within(strip).getAllByText("2025")).toHaveLength(2);
    expect(within(strip).getByText("5,14 %")).toBeInTheDocument();
    expect(within(strip).getByText("6.234")).toBeInTheDocument();
    expect(within(strip).getByText("T2 2026")).toBeInTheDocument();
    expect(await screen.findByText(/Banco Mundial – World Development Indicators · CC BY 4.0/)).toBeInTheDocument();
  });

  it("shows one indicator at a time: selecting exports swaps the chart, the note and the history", async () => {
    renderMacro();
    const strip = await screen.findByRole("region", { name: "Indicadores" });
    await userEvent.click(await within(strip).findByRole("button", { name: /Exportaciones no minero-energéticas/ }));

    expect((await screen.findAllByText(/Total nacional/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/unidad no declarada por la fuente/)).toBeInTheDocument();
    expect(screen.getByText(/MinCIT vía datos.gov.co · CC BY-SA 4.0/)).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "Historial del indicador" });
    expect(within(history).getAllByRole("listitem")).toHaveLength(2);
    expect(within(history).getByText("-3,8 %")).toBeInTheDocument();
  });

  it("shows the spot electricity price (XM), labelled as electricity, with provenance", async () => {
    const days = Array.from({ length: 10 }, (_, index) => ({ date: `2026-10-${String(10 + index).padStart(2, "0")}`, value: 250 + index }));
    const provenance = { url: "https://servapibi.xm.com.co/hourly", license: "sin licencia abierta declarada", attribution: "XM S.A. E.S.P.", fetchedAt: "2026-10-20T15:00:00.000Z" };
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok", unit: "COP/kWh", days, provenance })));
    window.fetch = fetchStub;
    renderMacro();

    const strip = await screen.findByRole("region", { name: "Indicadores" });
    await userEvent.click(await within(strip).findByRole("button", { name: /Precio de bolsa de energía/ }));

    expect((await screen.findAllByText(/Electricidad, no gas/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/XM S.A. E.S.P. · sin licencia abierta declarada/)).toBeInTheDocument();
  });

  it("names the failing source and keeps the others working", async () => {
    worldBankFetch.mockImplementation(({ indicator }: { indicator: string }) =>
      indicator === "pib" ? Promise.resolve(down("world-bank", "El Banco Mundial no respondió a tiempo.")) : wbAnswer({ indicator }),
    );
    renderMacro();

    expect(await screen.findByText("No pudimos consultar el Banco Mundial (PIB)")).toBeInTheDocument();
    expect(screen.getByText("El Banco Mundial no respondió a tiempo.")).toBeInTheDocument();
    expect(screen.getAllByText(/Los demás datos siguen disponibles/).length).toBeGreaterThan(0);
    const strip = screen.getByRole("region", { name: "Indicadores" });
    expect(await within(strip).findByText("5,14 %")).toBeInTheDocument();
    expect(within(strip).getByText("T2 2026")).toBeInTheDocument();
  });

  it("shows the empty state when the selected source has no data", async () => {
    exportsFetch.mockResolvedValue({ ok: false, error: { sourceId: "exports", kind: "empty", message: "Exportaciones no devolvió datos." } });
    renderMacro();
    const strip = await screen.findByRole("region", { name: "Indicadores" });
    await userEvent.click(await within(strip).findByRole("button", { name: /Exportaciones no minero-energéticas/ }));

    expect(await screen.findByText("La fuente no devolvió datos de exportaciones.")).toBeInTheDocument();
  });

  it("shows loading shapes before the sources answer", () => {
    worldBankFetch.mockReturnValue(new Promise(() => {}));
    exportsFetch.mockReturnValue(new Promise(() => {}));
    renderMacro();

    expect(screen.getAllByRole("status", { name: /Consultando/ }).length).toBeGreaterThan(0);
  });
});
