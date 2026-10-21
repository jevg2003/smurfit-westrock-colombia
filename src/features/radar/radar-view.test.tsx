// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, renderWithQuery, resetStores, secopDown, secopEmpty, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { RadarView } from "./radar-view";

describe("RadarView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3890")]);
  });
  afterEach(cleanup);

  it("shows the empty state when there are no new alerts", async () => {
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("No hay alertas nuevas")).toBeInTheDocument();
    expect(screen.getByText("Aún no has revisado ninguna alerta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Días y variaciones" })).toHaveAttribute("href", "/dias");
  });

  it("keeps working when SECOP fails and names the failing source", async () => {
    secopFetch.mockResolvedValue(secopDown);
    renderWithQuery(<RadarView />);

    expect(await screen.findByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect(screen.getByText("SECOP II no respondió a tiempo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(await screen.findByText("TRM hoy")).toBeInTheDocument();
  });

  it("shows the loading skeleton before the sources answer", () => {
    fetchTrm.mockReturnValue(new Promise(() => {}));
    secopFetch.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<RadarView />);

    expect(screen.getByRole("status", { name: "Consultando las fuentes" })).toBeInTheDocument();
  });
});
