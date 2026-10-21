// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Signal } from "@/core/domain/signal";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty } from "@/features/entorno/test-utils";
import { makeSignal } from "@/stores/test-utils";

const downloadCsv = vi.fn();
const downloadText = vi.fn();
const useSignalsMock = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(async () => secopEmpty) }));
vi.mock("@/lib/download", () => ({
  downloadCsv: (...args: unknown[]) => downloadCsv(...args),
  downloadText: (...args: unknown[]) => downloadText(...args),
}));
vi.mock("@/features/entorno/use-signals", () => ({ useSignals: () => useSignalsMock() }));

import { BriefingView } from "./briefing-view";

const ready = { status: "ready" as const, isStale: false, retry: () => {} };
const withSignals = (signals: Signal[]) => ({
  signals,
  contracts: [],
  trmRecords: [],
  trm: ready,
  secop: ready,
  isPending: false,
  hasHydrated: true,
});

// The fake clock says Tuesday 2026-10-20 in Bogota, so the default week is 2026-10-12 to 2026-10-18.
const IN_WEEK = makeSignal("a", {
  dimension: "procurement",
  severity: "alert",
  title: "Contrato con Industria Licorera del Cauca vence en 12 días",
  ruleText: "Contrato de la empresa con fin ≤ 90 días",
  occurredAt: "2026-10-14T05:00:00.000Z",
  provenance: [
    {
      sourceId: "secop",
      url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.9151243",
      fetchedAt: "2026-10-20T15:00:00.000Z",
      license: "CC BY-SA 4.0",
      attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
    },
  ],
});
const OUT_OF_WEEK = makeSignal("b", { dimension: "macro", title: "La TRM subió 3,00% el 2026-10-01", occurredAt: "2026-10-01T05:00:00.000Z" });

describe("BriefingView", () => {
  beforeEach(() => {
    resetStores();
    downloadCsv.mockReset();
    downloadText.mockReset();
    useSignalsMock.mockReturnValue(withSignals([IN_WEEK, OUT_OF_WEEK]));
  });
  afterEach(cleanup);

  it("previews the previous week grouped by dimension, with the no-AI note", () => {
    renderWithQuery(<BriefingView />);

    const doc = screen.getByRole("article", { name: "Vista previa del briefing" });
    expect(within(doc).getByText("2026-10-12 al 2026-10-18")).toBeInTheDocument();
    expect(within(doc).getByRole("heading", { name: "Contratación" })).toBeInTheDocument();
    expect(within(doc).getByText(IN_WEEK.title)).toBeInTheDocument();
    expect(within(doc).queryByText(OUT_OF_WEEK.title)).not.toBeInTheDocument();
    expect(within(doc).getByText("generado por reglas, sin IA")).toBeInTheDocument();
  });

  it("offers print, Markdown and CSV, and prints through window.print", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderWithQuery(<BriefingView />);

    await user.click(screen.getByRole("button", { name: /Imprimir \/ Guardar PDF/ }));
    expect(print).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Descargar Markdown/ }));
    const [mdName, markdown] = downloadText.mock.calls[0] as [string, string];
    expect(mdName).toMatch(/^briefing-2026-10-12-2026-10-18\.md$/);
    expect(markdown).toContain("generado por reglas, sin IA");

    await user.click(screen.getByRole("button", { name: /Descargar CSV/ }));
    const [csvName, csv] = downloadCsv.mock.calls[0] as [string, string];
    expect(csvName).toMatch(/^briefing-2026-10-12-2026-10-18\.csv$/);
    expect(csv).toContain(IN_WEEK.title);
    print.mockRestore();
  });

  it("shows the empty state when the period has no signals", () => {
    useSignalsMock.mockReturnValue(withSignals([OUT_OF_WEEK]));
    renderWithQuery(<BriefingView />);

    expect(screen.getByText("No hay señales en este período")).toBeInTheDocument();
  });
});
