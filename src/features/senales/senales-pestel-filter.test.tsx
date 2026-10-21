// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeContract } from "@/core/rules/test-fixtures";
import { fakeContainer, renderWithQuery, resetStores, secopOk, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();
let query = "";

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query) }));

import { SenalesView } from "./senales-view";

describe("SenalesView with a ?pestel= param", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopOk([makeContract({ endsAt: "2026-12-31T00:00:00.000-05:00" })]));
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "4000"), trmRecord("2026-10-16", "3900")]);
  });
  afterEach(cleanup);

  it("lists every signal without the param", async () => {
    query = "";
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
    expect(await screen.findByText(/Contrato con .* vence en/)).toBeInTheDocument();
  });

  it("keeps only the signals of that PESTEL factor and says so", async () => {
    query = "pestel=political";
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/Contrato con .* vence en/)).toBeInTheDocument();
    expect(screen.queryByText(/La TRM subió/)).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando solo el factor PESTEL/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas las señales" })).toHaveAttribute("href", "/senales");
  });

  it("ignores an unknown factor", async () => {
    query = "pestel=bogus";
    renderWithQuery(<SenalesView />);

    expect(await screen.findByText(/La TRM subió/)).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando solo el factor PESTEL/)).not.toBeInTheDocument();
  });
});
