// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty } from "@/features/entorno/test-utils";
import { useDecisionsStore } from "@/stores/decisions.store";
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

// The fake clock says Tuesday 2026-10-20 in Bogota, so the default week is 2026-10-12 to 2026-10-18.
const SIGNAL = makeSignal("a", {
  pestel: "political",
  ruleId: "secop.expiring-contract.v1",
  severity: "alert",
  title: "Contrato vence en 12 días",
  occurredAt: "2026-10-14T05:00:00.000Z",
  provenance: [
    {
      sourceId: "secop",
      url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=1",
      fetchedAt: "2026-10-20T15:00:00.000Z",
      license: "CC BY-SA 4.0",
      attribution: "Colombia Compra Eficiente",
    },
  ],
});

describe("BriefingView PESTEL reading", () => {
  beforeEach(() => {
    resetStores();
    downloadCsv.mockReset();
    downloadText.mockReset();
    useDecisionsStore.setState({ decisions: [] });
    useSignalsMock.mockReturnValue({
      signals: [SIGNAL],
      contracts: [],
      trmRecords: [],
      trm: ready,
      secop: ready,
      isPending: false,
      hasHydrated: true,
    });
  });
  afterEach(cleanup);

  it("shows the Lectura PESTEL with sourced top signals and the open decisions", () => {
    useDecisionsStore.getState().create({ title: "¿Renovamos los contratos?", question: "", pestelFactors: ["political"] });
    renderWithQuery(<BriefingView />);

    const doc = screen.getByRole("article", { name: "Vista previa del briefing" });
    const pestel = within(doc).getByRole("region", { name: "Lectura PESTEL" });
    expect(within(pestel).getByText("Político")).toBeInTheDocument();
    expect(within(pestel).getByText(/no es un pronóstico/)).toBeInTheDocument();
    expect(within(pestel).getByRole("link", { name: "Registro original" })).toHaveAttribute(
      "href",
      expect.stringContaining("datos.gov.co"),
    );
    const decisions = within(doc).getByRole("region", { name: "Decisiones abiertas" });
    expect(within(decisions).getByText("¿Renovamos los contratos?")).toBeInTheDocument();
  });

  it("adds the reading and the decisions to the Markdown and CSV downloads", async () => {
    const user = userEvent.setup();
    useDecisionsStore.getState().create({ title: "¿Renovamos los contratos?", question: "", pestelFactors: ["political"] });
    renderWithQuery(<BriefingView />);

    await user.click(screen.getByRole("button", { name: /Descargar Markdown/ }));
    const markdown = downloadText.mock.calls[0][1] as string;
    expect(markdown).toContain("## Lectura PESTEL");
    expect(markdown).toContain("## Decisiones abiertas");

    await user.click(screen.getByRole("button", { name: /Descargar CSV/ }));
    const csv = downloadCsv.mock.calls[0][1] as string;
    expect(csv).toContain("lectura PESTEL");
    expect(csv).toContain("decisión abierta");
  });
});
