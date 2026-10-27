// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Signal } from "@/core/domain/signal";
import { useAlertsStore } from "@/stores/alerts.store";
import { makeSignal } from "@/stores/test-utils";
import { SignalDetailSheet } from "./signal-detail-sheet";

const SIGNAL: Signal = makeSignal("secop.expiring-contract.v1:CO1.PCCNTR.9151243:2026-10-12", {
  ruleId: "secop.expiring-contract.v1",
  ruleText: "Contrato de la empresa con fin ≤ 90 días (vigilar) o fin ≤ 30 días (alerta)",
  dimension: "procurement",
  title: "Contrato con Industria Licorera del Cauca vence en 72 días",
  detail: "COP 807.534.110, termina el 2026-12-31.",
  evidence: [{ kind: "contract", ref: "CO1.PCCNTR.9151243" }],
  provenance: [
    {
      sourceId: "secop",
      url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.9151243",
      fetchedAt: "2026-10-20T12:00:00.000Z",
      license: "CC BY-SA 4.0",
      attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
    },
  ],
});

function open(signal: Signal = SIGNAL, onOpenChange = vi.fn()) {
  render(<SignalDetailSheet signal={signal} onOpenChange={onOpenChange} />);
  return onOpenChange;
}

const alertOf = (id: string) => useAlertsStore.getState().alerts.find((alert) => alert.signalId === id);

describe("SignalDetailSheet", () => {
  beforeEach(() => {
    useAlertsStore.setState({ alerts: [] });
  });
  afterEach(cleanup);

  it("shows the rule with its threshold, the evidence and the provenance", () => {
    open();

    expect(screen.getByText(SIGNAL.ruleText)).toBeInTheDocument();
    expect(screen.getByText(/CO1\.PCCNTR\.9151243/)).toBeInTheDocument();
    expect(screen.getByText("CC BY-SA 4.0")).toBeInTheDocument();
    expect(screen.getByText(/Agencia Nacional de Contratación Pública/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver registro original/ })).toHaveAttribute(
      "href",
      SIGNAL.provenance[0].url,
    );
  });

  it("refuses to dismiss without a note and says why", async () => {
    const user = userEvent.setup();
    const onOpenChange = open();

    await user.click(screen.getByRole("button", { name: "Descartar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Escriba una nota para descartar el aviso.");
    expect(alertOf(SIGNAL.id)?.state).not.toBe("dismissed");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("dismisses with a note and keeps the note", async () => {
    const user = userEvent.setup();
    const onOpenChange = open();

    await user.type(screen.getByLabelText(/Nota/), "Contrato ya renovado");
    await user.click(screen.getByRole("button", { name: "Descartar" }));

    expect(alertOf(SIGNAL.id)).toMatchObject({ state: "dismissed", note: "Contrato ya renovado" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("marks as reviewed without a note", async () => {
    const user = userEvent.setup();
    open();

    await user.click(screen.getByRole("button", { name: "Marcar revisada" }));

    expect(alertOf(SIGNAL.id)?.state).toBe("reviewed");
  });
});
