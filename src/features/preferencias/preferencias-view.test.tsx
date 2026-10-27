// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveAttribute("aria-required", "true");
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
    await user.type(screen.getByLabelText(/Días antes del fin para vigilar/), "800");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Escriba un número.")).toBeInTheDocument();
    expect(screen.getByText("El valor no puede pasar de 730.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveAttribute("aria-invalid", "true");
    expect(usePreferencesStore.getState().thresholds).toEqual(TEST_COMPANY.thresholds);
  });

  it("refuses a term longer than the company limits", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);
    const input = within(screen.getByRole("group", { name: "Sector" })).getByLabelText("Sector");
    const tooLong = "x".repeat(121);
    await user.click(input);
    await user.paste(tooLong);
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("button", { name: `Quitar ${tooLong}`, hidden: true })).not.toBeInTheDocument();
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

    const group = within(screen.getByRole("group", { name: "Sector" }));
    for (const term of usePreferencesStore.getState().newsTermGroups.sector) {
      await user.click(group.getByRole("button", { name: `Quitar ${term}` }));
    }
    await user.type(group.getByLabelText("Sector"), "hierro{Enter}acero{Enter}");
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(usePreferencesStore.getState().newsTermGroups.sector).toEqual(["hierro", "acero"]);
  });

  it("edits the context and excluded words of a group", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    const { company, sector } = usePreferencesStore.getState().newsContext;
    const companyGroup = within(screen.getByRole("group", { name: "Empresa y competidores" }));
    const sectorGroup = within(screen.getByRole("group", { name: "Sector" }));
    const contextList = within(companyGroup.getByRole("toolbar", { name: "Agregados en Palabras de contexto (Empresa y competidores)" }));
    for (const word of company.requireAny) await user.click(contextList.getByRole("button", { name: `Quitar ${word}` }));
    const excludeList = within(sectorGroup.getByRole("toolbar", { name: "Agregados en Palabras a excluir (Sector)" }));
    for (const word of sector.excludeAny) await user.click(excludeList.getByRole("button", { name: `Quitar ${word}` }));
    await user.type(companyGroup.getByLabelText("Palabras de contexto (Empresa y competidores)"), "Itagüí{Enter}");
    await user.type(sectorGroup.getByLabelText("Palabras a excluir (Sector)"), "fútbol{Enter}");
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(usePreferencesStore.getState().newsContext.company.requireAny).toEqual(["Itagüí"]);
    expect(usePreferencesStore.getState().newsContext.sector.excludeAny).toEqual(["fútbol"]);
  });

  it("offers context and excluded words for every group", () => {
    render(<PreferenciasView />);
    for (const group of deriveNewsGroupDefinitions(TEST_COMPANY)) {
      const fieldset = within(screen.getByRole("group", { name: group.label }));
      expect(fieldset.getByLabelText(`Palabras de contexto (${group.label})`)).toBeInTheDocument();
      expect(fieldset.getByLabelText(`Palabras a excluir (${group.label})`)).toBeInTheDocument();
    }
  });

});
