// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
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

  it("shows GDP, CPI and exports with their year, source and license", async () => {
    renderMacro();

    const gdp = (await screen.findByText("PIB real")).closest("[data-slot=card]") as HTMLElement;
    expect(within(gdp).getByText("2,64 %")).toBeInTheDocument();
    expect(within(gdp).getByText(/2025/)).toBeInTheDocument();
    expect(within(gdp).getByText(/Banco Mundial – World Development Indicators · CC BY 4.0/)).toBeInTheDocument();

    const cpi = (await screen.findByText("Inflación anual (IPC)")).closest("[data-slot=card]") as HTMLElement;
    expect(within(cpi).getByText("5,14 %")).toBeInTheDocument();

    const exportsCard = (await screen.findByText("Exportaciones no minero-energéticas")).closest("[data-slot=card]") as HTMLElement;
    expect(within(exportsCard).getByText(/T2 2026/)).toBeInTheDocument();
    expect(within(exportsCard).getByText(/Total nacional/)).toBeInTheDocument();
    expect(within(exportsCard).getByText(/unidad no declarada por la fuente/)).toBeInTheDocument();
    expect(within(exportsCard).getByText(/MinCIT vía datos.gov.co · CC BY-SA 4.0/)).toBeInTheDocument();
  });

  it("shows the TRM next to the macro figures", async () => {
    renderMacro();
    expect(await screen.findByText("TRM hoy")).toBeInTheDocument();
    expect(await screen.findByText("Histórico de la TRM")).toBeInTheDocument();
  });

  it("names the failing source and keeps the others working", async () => {
    worldBankFetch.mockImplementation(({ indicator }: { indicator: string }) =>
      indicator === "pib" ? Promise.resolve(down("world-bank", "El Banco Mundial no respondió a tiempo.")) : wbAnswer({ indicator }),
    );
    renderMacro();

    expect(await screen.findByText("No pudimos consultar el Banco Mundial (PIB)")).toBeInTheDocument();
    expect(screen.getByText("El Banco Mundial no respondió a tiempo.")).toBeInTheDocument();
    expect(await screen.findByText("5,14 %")).toBeInTheDocument();
    expect((await screen.findAllByText(/T2 2026/)).length).toBeGreaterThan(0);
  });

  it("shows the empty state when a source has no data", async () => {
    exportsFetch.mockResolvedValue({ ok: false, error: { sourceId: "exports", kind: "empty", message: "Exportaciones no devolvió datos." } });
    renderMacro();

    expect(await screen.findByText("La fuente no devolvió datos de exportaciones.")).toBeInTheDocument();
  });

  it("shows loading skeletons before the sources answer", () => {
    worldBankFetch.mockReturnValue(new Promise(() => {}));
    exportsFetch.mockReturnValue(new Promise(() => {}));
    fetchTrm.mockReturnValue(new Promise(() => {}));
    renderMacro();

    expect(screen.getAllByRole("status", { name: /Consultando/ }).length).toBeGreaterThan(0);
  });
});
