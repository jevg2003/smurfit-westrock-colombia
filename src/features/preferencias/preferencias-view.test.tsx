// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
import { resetStores } from "@/features/entorno/test-utils";
import { AtipicosCard } from "@/features/trm/atipicos-card";
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

  it("validates, saves, and the rule text and the TRM components follow the new values", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PreferenciasView />
        <AtipicosCard datos={[]} estaGuardado={() => false} onAlternarAlerta={() => {}} />
      </>,
    );

    const watch = screen.getByLabelText(/Variación diaria de la TRM para vigilar/);
    await user.clear(watch);
    await user.type(watch, "0");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("El valor debe ser mayor que cero.")).toBeInTheDocument();
    expect(usePreferencesStore.getState().thresholds.trmDailyMovePct).toBe(DEFAULT_THRESHOLDS.trmDailyMovePct);

    await user.clear(watch);
    await user.type(watch, "1,5");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(usePreferencesStore.getState().thresholds.trmDailyMovePct).toBe(1.5);
    expect(screen.getByText(/Variación diaria de la TRM de 1.5% o más/)).toBeInTheDocument();
    expect(screen.getByText(/Se marcan los días con 1.5% o más de cambio/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preferencias guardadas");
  });

  it("restores the defaults", async () => {
    const user = userEvent.setup();
    usePreferencesStore.getState().setThreshold("trmDailyMovePct", 1.8);
    render(<PreferenciasView />);

    await user.click(screen.getByRole("button", { name: "Restablecer valores por defecto" }));

    expect(usePreferencesStore.getState().thresholds).toEqual(DEFAULT_THRESHOLDS);
    expect(screen.getByLabelText(/Variación diaria de la TRM para vigilar/)).toHaveValue("1");
  });

  it("edits a news term group", async () => {
    const user = userEvent.setup();
    render(<PreferenciasView />);

    const sector = screen.getByLabelText(/Sector/);
    await user.clear(sector);
    await user.type(sector, "kraft{Enter}cartón");
    await user.click(screen.getByRole("button", { name: "Guardar términos" }));

    expect(usePreferencesStore.getState().newsTermGroups.sector).toEqual(["kraft", "cartón"]);
  });
});
