// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FuenteGroup } from "./build-rows";
import { CATALOG } from "./catalog";

const state: { groups: FuenteGroup[] } = { groups: [] };
vi.mock("./use-fuentes", () => ({
  useFuentes: () => ({ groups: state.groups, total: state.groups.reduce((sum, group) => sum + group.rows.length, 0) }),
}));

import { FuentesView } from "./fuentes-view";

afterEach(() => {
  cleanup();
  state.groups = [];
});

describe("FuentesView", () => {
  it("shows an empty state when there are no sources", () => {
    render(<FuentesView />);
    expect(screen.getByText("No hay fuentes configuradas")).toBeInTheDocument();
  });

  it("shows facts, last error kind and flag, and retries one source on its own", async () => {
    const retry = vi.fn();
    const other = vi.fn();
    state.groups = [
      {
        id: "g",
        title: "Grupo",
        rows: [
          {
            entry: CATALOG.secop,
            snapshot: { state: "error", error: { kind: "rate_limited", message: "SECOP II limitó las consultas." }, retry },
          },
          { entry: CATALOG.googleNews, snapshot: { state: "disabled", retry: other }, flag: false },
          { entry: CATALOG.trm, snapshot: { state: "ok", lastSuccess: Date.UTC(2026, 9, 20, 15, 0), retry: vi.fn() } },
        ],
      },
    ];
    render(<FuentesView />);

    const secop = screen.getByText("SECOP II").closest("[data-slot=card]") as HTMLElement;
    expect(within(secop).getByText("Con error")).toBeInTheDocument();
    expect(within(secop).getByText("Límite de consultas")).toBeInTheDocument();
    expect(within(secop).getByText("SECOP II limitó las consultas.")).toBeInTheDocument();
    expect(within(secop).getByText("CC BY-SA 4.0")).toBeInTheDocument();
    expect(within(secop).getByText("Navegador")).toBeInTheDocument();

    await userEvent.click(within(secop).getByRole("button", { name: "Reintentar SECOP II" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();

    const google = screen.getByText("Google News").closest("[data-slot=card]") as HTMLElement;
    expect(within(google).getByText("Desactivada", { selector: "dd" })).toBeInTheDocument();
    expect(within(google).getByText("Proxy del servidor")).toBeInTheDocument();

    const trm = screen.getByText("TRM").closest("[data-slot=card]") as HTMLElement;
    expect(within(trm).getByText("Funcionando")).toBeInTheDocument();
    expect(within(trm).getByText("Ninguno")).toBeInTheDocument();
  });

  it("shows a loading state per source while it is pending", () => {
    state.groups = [{ id: "g", title: "Grupo", rows: [{ entry: CATALOG.trm, snapshot: { state: "pending" } }] }];
    render(<FuentesView />);
    expect(screen.getByText("Consultando", { selector: "[data-slot=badge], span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reintentar/ })).not.toBeInTheDocument();
  });
});
