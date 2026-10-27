// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStores } from "@/features/entorno/test-utils";
import { useHydrationStore } from "@/stores/hydration.store";
import { useWatchlistStore } from "@/stores/watchlist.store";
import { SeguimientoView } from "./seguimiento-view";

describe("SeguimientoView", () => {
  beforeEach(() => resetStores());
  afterEach(cleanup);

  it("lists every configured competitor as followed and every indicator", () => {
    render(<SeguimientoView />);

    expect(screen.getByRole("button", { name: "Dejar de seguir a Competidora Uno" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dejar de seguir a Competidora Dos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dejar de seguir a Competidora Tres" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dejar de seguir TRM (dólar)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Seguir PIB real" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Seguir Inflación anual (IPC)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir Exportaciones" })).toBeInTheDocument();
  });

  it("removes and adds a competitor in the watchlist", async () => {
    const user = userEvent.setup();
    render(<SeguimientoView />);

    await user.click(screen.getByRole("button", { name: "Dejar de seguir a Competidora Uno" }));
    expect(useWatchlistStore.getState().competitorNits).not.toContain("900000002");
    expect(screen.getByRole("button", { name: "Seguir a Competidora Uno" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Seguir a Competidora Uno" }));
    expect(useWatchlistStore.getState().competitorNits).toContain("900000002");
  });

  it("toggles indicators", async () => {
    const user = userEvent.setup();
    render(<SeguimientoView />);

    await user.click(screen.getByRole("button", { name: "Seguir Exportaciones" }));
    expect(useWatchlistStore.getState().indicators).toContain("exportaciones");
    await user.click(screen.getByRole("button", { name: "Dejar de seguir TRM (dólar)" }));
    expect(useWatchlistStore.getState().indicators).not.toContain("trm");
  });

  it("says honestly which indicators produce signals today", () => {
    render(<SeguimientoView />);
    expect(screen.getByText(/Hoy solo la TRM genera señales/)).toBeInTheDocument();
  });

  it("shows a skeleton until the stores are hydrated", () => {
    resetStores({ hydrated: false });
    render(<SeguimientoView />);

    expect(screen.getByRole("status", { name: "Cargando tus seguimientos" })).toBeInTheDocument();
    expect(useHydrationStore.getState().hasHydrated).toBe(false);
  });
});
