// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContainer, renderWithQuery, resetStores, secopEmpty, trmRecord } from "@/features/entorno/test-utils";

const secopFetch = vi.fn();
const fetchTrm = vi.fn();

vi.mock("@/features/entorno/container", () => ({ getContainer: () => fakeContainer(secopFetch) }));
vi.mock("@/features/trm/api", () => ({ fetchTrm: (...args: unknown[]) => fetchTrm(...args) }));

import { TimelineView } from "./timeline-view";

describe("TimelineView", () => {
  beforeEach(() => {
    resetStores();
    secopFetch.mockResolvedValue(secopEmpty);
    fetchTrm.mockResolvedValue([trmRecord("2026-10-19", "3900"), trmRecord("2026-10-16", "3899")]);
  });
  afterEach(cleanup);

  it("shows the empty state when there are no events", async () => {
    renderWithQuery(<TimelineView />);

    expect(await screen.findByText("No hay eventos para mostrar")).toBeInTheDocument();
  });

  it("lists events newest first", async () => {
    fetchTrm.mockResolvedValue([
      trmRecord("2026-10-19", "4000"),
      trmRecord("2026-10-16", "3900"),
      trmRecord("2026-10-15", "3800"),
    ]);
    renderWithQuery(<TimelineView />);

    const items = await screen.findAllByText(/La TRM (subió|bajó)/);
    expect(items[0]).toHaveTextContent("2026-10-19");
  });
});
