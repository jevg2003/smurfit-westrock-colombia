// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeContract } from "@/core/rules/test-fixtures";
import { addDaysToKey, bogotaDateKey } from "@/core/time/bogota";
import { mockViewport } from "@/components/layouts/viewport.test-utils";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, secopOk, trmRecord } from "@/features/entorno/test-utils";
import { useDecisionsStore } from "@/stores/decisions.store";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();
const downloadCsv = vi.fn();
const downloadText = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("@/lib/download", () => ({
  downloadCsv: (...args: unknown[]) => downloadCsv(...args),
  downloadText: (...args: unknown[]) => downloadText(...args),
}));

import { PestelView } from "./pestel-view";

// The fake clock says Tuesday 2026-10-20 in Bogota.
const OWN_EXPIRING = makeContract({ id: "CO1.PCCNTR.OWN", endsAt: "2026-12-31T00:00:00.000-05:00" });

describe("PestelView", () => {
  beforeEach(() => {
    mockViewport(1280);
    resetStores();
    useDecisionsStore.setState({ decisions: [] });
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
    downloadCsv.mockClear();
    downloadText.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists the six factors, even when none has avisos, and shows the first one in the pane", async () => {
    renderWithQuery(<PestelView />);

    const matrix = await screen.findByRole("region", { name: "Matriz PESTEL" });
    for (const name of ["Político", "Económico", "Social", "Tecnológico", "Ambiental", "Legal"]) {
      expect(within(matrix).getByRole("button", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    expect(within(matrix).getAllByText("Sin avisos en este período")).toHaveLength(6);
    expect(screen.getByRole("article", { name: "Factor Político" })).toBeInTheDocument();
  });

  it("gives each factor row its own decorative icon", async () => {
    renderWithQuery(<PestelView />);

    const matrix = await screen.findByRole("region", { name: "Matriz PESTEL" });
    const rows = within(matrix).getAllByRole("listitem");
    expect(rows[0].querySelector('[data-slot="row-media"] svg.lucide-landmark')).not.toBeNull();
    expect(rows[5].querySelector('[data-slot="row-media"] svg.lucide-gavel')).not.toBeNull();
    for (const row of rows) expect(row.querySelectorAll('[data-slot="row-media"] svg[aria-hidden="true"]')).toHaveLength(1);
  });

  it("puts an expiring own contract under Político, with a link to the original record and a prefiltered link", async () => {
    secopFetch.mockResolvedValue(secopOk([OWN_EXPIRING]));
    renderWithQuery(<PestelView />);

    const political = await screen.findByRole("article", { name: "Factor Político" });
    await waitFor(() => expect(within(political).getByText(/vence en/)).toBeInTheDocument());
    expect(within(political).getByRole("link", { name: /vence en/ })).toHaveAttribute("href", expect.stringContaining("datos.gov.co"));
    expect(within(political).getByRole("link", { name: /Ver avisos de este factor/ })).toHaveAttribute("href", "/resumen?tab=avisos&pestel=political");
    expect(within(political).getByText(/Por evaluar: 1/)).toBeInTheDocument();
    expect(within(political).getByText(/comparación de conteos, no un pronóstico/)).toBeInTheDocument();
  });

  it("switches the pane to the factor that was picked in the list", async () => {
    renderWithQuery(<PestelView />);
    const matrix = await screen.findByRole("region", { name: "Matriz PESTEL" });

    await userEvent.click(within(matrix).getByRole("button", { name: /^Legal/ }));

    expect(screen.getByRole("article", { name: "Factor Legal" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Factor Político" })).not.toBeInTheDocument();
  });

  it("creates a decision from a template, labeled as plantilla, and then edits it", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PestelView />);
    await screen.findByRole("region", { name: "Matriz PESTEL" });

    await user.click(screen.getByRole("button", { name: /Nueva decisión/ }));
    expect(screen.getAllByText("Plantilla").length).toBeGreaterThanOrEqual(4);
    await user.click(screen.getByRole("button", { name: /Cubrimos la exposición cambiaria/ }));
    await user.click(screen.getByRole("button", { name: "Crear decisión" }));

    await waitFor(() => expect(useDecisionsStore.getState().decisions).toHaveLength(1));
    const [created] = useDecisionsStore.getState().decisions;
    expect(created.title).toMatch(/exposición cambiaria/);
    expect(created.pestelFactors).toEqual(["economic"]);
    expect(created.options.map((option) => option.label)).toEqual(["Cubrir", "Cubrir una parte", "No cubrir"]);
    expect(await screen.findByLabelText("Opción 1")).toHaveValue("Cubrir");
  });

  it("asks for a rationale before marking a decision as decided", async () => {
    const user = userEvent.setup();
    const created = useDecisionsStore.getState().create({ title: "Decidir algo", question: "?", pestelFactors: ["legal"] });
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: "Abrir: Decidir algo" }));
    await user.click(await screen.findByRole("button", { name: "Decidida" }));
    await user.click(screen.getByRole("button", { name: "Aplicar estado" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/motivo/i);
    expect(useDecisionsStore.getState().decisions[0].status).toBe("open");

    await user.type(screen.getByLabelText(/Motivo/), "Cumplimos la norma");
    await user.click(screen.getByRole("button", { name: "Aplicar estado" }));

    await waitFor(() => expect(useDecisionsStore.getState().decisions.find((item) => item.id === created.id)?.status).toBe("decided"));
  });

  it("takes the required mark and the limits of the decision fields from the schema", async () => {
    const user = userEvent.setup();
    useDecisionsStore.getState().create({ title: "Decidir algo", question: "?", pestelFactors: ["legal"] });
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: "Abrir: Decidir algo" }));
    expect(screen.getByLabelText("Título")).toHaveAttribute("maxlength", "120");
    expect(screen.getByLabelText("Título")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Responsable")).toHaveAttribute("maxlength", "80");
    expect(screen.getByLabelText("Responsable")).not.toHaveAttribute("aria-required");
    expect(screen.getByLabelText("Motivo")).not.toHaveAttribute("aria-required");
    await user.click(screen.getByRole("button", { name: "Decidida" }));
    expect(screen.getByLabelText("Motivo")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Motivo")).toHaveAttribute("maxlength", "1000");
  });

  it("blocks discarding without a rationale, with the message under the field", async () => {
    const user = userEvent.setup();
    useDecisionsStore.getState().create({ title: "Decidir algo", question: "?", pestelFactors: ["legal"] });
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: "Abrir: Decidir algo" }));
    await user.click(await screen.findByRole("button", { name: "Descartada" }));
    await user.click(screen.getByRole("button", { name: "Aplicar estado" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Escriba el motivo para marcar la decisión como decidida o descartada.");
    expect(screen.getByLabelText(/Motivo/)).toHaveAttribute("aria-invalid", "true");
    expect(useDecisionsStore.getState().decisions[0].status).toBe("open");
  });

  it("asks for a title before creating a decision", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: /Nueva decisión/ }));
    await user.click(screen.getByRole("button", { name: "Crear decisión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Escriba un título para la decisión.");
    expect(useDecisionsStore.getState().decisions).toHaveLength(0);
  });

  it("picks the review date with the calendar shortcuts instead of a native date input", async () => {
    const user = userEvent.setup();
    useDecisionsStore.getState().create({ title: "Decidir algo", question: "?", pestelFactors: ["legal"] });
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: "Abrir: Decidir algo" }));
    expect(document.querySelector('input[type="date"]')).toBeNull();
    await user.click(await screen.findByRole("button", { name: /Revisar el: Elegir fecha/ }));
    await user.click(await screen.findByRole("button", { name: "Mañana" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const tomorrow = addDaysToKey(bogotaDateKey(new Date()), 1);
    await waitFor(() => expect(useDecisionsStore.getState().decisions[0].reviewAt).toBe(tomorrow));
  });

  it("exports the decisions to CSV and Markdown", async () => {
    const user = userEvent.setup();
    useDecisionsStore.getState().create({ title: "Una decisión", question: "?", pestelFactors: ["economic"] });
    renderWithQuery(<PestelView />);

    await user.click(await screen.findByRole("button", { name: /Exportar CSV/ }));
    expect(downloadCsv).toHaveBeenCalledWith(expect.stringMatching(/^decisiones-.*\.csv$/), expect.stringContaining("Una decisión"));

    await user.click(screen.getByRole("button", { name: /Exportar Markdown/ }));
    expect(downloadText).toHaveBeenCalledWith(
      expect.stringMatching(/\.md$/),
      expect.stringContaining("## Una decisión"),
      { mime: "text/markdown" },
    );
  });
});
