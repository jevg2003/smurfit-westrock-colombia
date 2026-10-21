// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { SenalesView } from "./senales-view";

describe("SenalesView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when no rule fires", async () => {
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText("No hay señales para mostrar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeDisabled();
  });

  it("lists a TRM move as a signal that cites the active threshold", async () => {
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/La TRM subió 2,56% el 2026-10-19/)).toBeInTheDocument();
  });
});
