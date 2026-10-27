// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deriveNewsGroupDefinitions } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { resetStores } from "@/features/entorno/test-utils";
import { usePreferencesStore } from "@/stores/preferences.store";
import { PreferenciasView } from "./preferencias-view";

describe("PreferenciasView", () => {
  beforeEach(() => resetStores());
  afterEach(cleanup);

  it("shows the active thresholds and the rule text built from them", () => {
    render(<PreferenciasView />);

    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveValue("1");
    expect(screen.getByText(/Variación diaria de la TRM de 1% o más/)).toBeInTheDocument();
  });

  it("validates, saves, and the rule text follows the new values", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    const watch = screen.getByLabelText(/Variación diaria de la TRM para vigilar/);
    await user.clear(watch);
    await user.type(watch, "0");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("El valor debe ser mayor que cero.")).toBeInTheDocument();
    expect(usePreferencesStore.getState().thresholds.trmDailyMovePct).toBe(TEST_COMPANY.thresholds.trmDailyMovePct);

    await user.clear(watch);
    await user.type(watch, "1,5");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(usePreferencesStore.getState().thresholds.trmDailyMovePct).toBe(1.5);
    expect(screen.getByText(/Variación diaria de la TRM de 1.5% o más/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preferencias guardadas");
  });

  it("shows every threshold problem at once, under its field, and saves nothing", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    await user.clear(screen.getByLabelText(/Variación diaria de la TRM para vigilar/));
    await user.clear(screen.getByLabelText(/Días antes del fin para vigilar/));
    await user.type(screen.getByLabelText(/Días antes del fin para vigilar/), "45,5");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Escriba un número.")).toBeInTheDocument();
    expect(screen.getByText("Usa un número entero de días.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveAttribute("aria-invalid", "true");
    expect(usePreferencesStore.getState().thresholds).toEqual(TEST_COMPANY.thresholds);
  });

  it("refuses a term that is too long and keeps the saved terms", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);
    const before = usePreferencesStore.getState().newsTermGroups.sector;

    const sector = screen.getByLabelText("Sector");
    await user.clear(sector);
    await user.click(sector);
    await user.paste("a".repeat(81));
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(await screen.findByText("Cada término puede tener hasta 80 caracteres.")).toBeInTheDocument();
    expect(usePreferencesStore.getState().newsTermGroups.sector).toEqual(before);
  });

  it("restores the defaults", async () => {
    const user = userEvent.setup();
    usePreferencesStore.getState().setThreshold("trmDailyMovePct", 1.8);
    render(<PreferenciasView />);

    await user.click(screen.getByRole("button", { name: "Restablecer valores por defecto" }));

    expect(usePreferencesStore.getState().thresholds).toEqual(TEST_COMPANY.thresholds);
    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveValue("1");
  });

  it("edits a news term group", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    const sector = screen.getByLabelText("Sector");
    await user.clear(sector);
    await user.type(sector, "hierro{Enter}acero");
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(usePreferencesStore.getState().newsTermGroups.sector).toEqual(["hierro", "acero"]);
  });

  it("edits the context and excluded words of a group", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    const context = screen.getByLabelText("Palabras de contexto (Empresa y competidores)");
    await user.clear(context);
    await user.type(context, "Itagüí");
    const exclude = screen.getByLabelText("Palabras a excluir (Sector)");
    await user.clear(exclude);
    await user.type(exclude, "fútbol");
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(usePreferencesStore.getState().newsContext.company.requireAny).toEqual(["Itagüí"]);
    expect(usePreferencesStore.getState().newsContext.sector.excludeAny).toEqual(["fútbol"]);
  });

  it("offers context and excluded words for every group", () => {
    render(<PreferenciasView />);
    for (const group of deriveNewsGroupDefinitions(TEST_COMPANY)) {
      expect(screen.getByLabelText(`Palabras de contexto (${group.label})`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Palabras a excluir (${group.label})`)).toBeInTheDocument();
    }
  });

  it("refuses a context word that is too long and keeps the saved words", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);
    const before = usePreferencesStore.getState().newsContext.company;

    const context = screen.getByLabelText("Palabras de contexto (Empresa y competidores)");
    await user.clear(context);
    await user.click(context);
    await user.paste("a".repeat(81));
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(await screen.findByText("Cada palabra puede tener hasta 80 caracteres.")).toBeInTheDocument();
    expect(usePreferencesStore.getState().newsContext.company).toEqual(before);
  });
});
