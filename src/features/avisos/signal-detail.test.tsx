// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlertsStore } from "@/stores/alerts.store";
import { makeSignal } from "@/stores/test-utils";
import { SignalDetail } from "./signal-detail";

const SIGNAL = makeSignal("secop.expiring-contract.v1:CO1.PCCNTR.1:2026-10-12", {
  evidence: [
    { kind: "contract", ref: "CO1.PCCNTR.1" },
    { kind: "news", ref: "https://example.com/nota" },
  ],
});

describe("SignalDetail evidence", () => {
  beforeEach(() => {
    useAlertsStore.setState({ alerts: [] });
  });
  afterEach(cleanup);

  it("shows a decorative icon per evidence kind next to its label", () => {
    render(<SignalDetail signal={SIGNAL} onDone={vi.fn()} />);

    const items = screen.getByRole("heading", { name: "Evidencia" }).parentElement!.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('svg.lucide-file-text[aria-hidden="true"]')).not.toBeNull();
    expect(items[1].querySelector('svg.lucide-newspaper[aria-hidden="true"]')).not.toBeNull();
    expect(items[0]).toHaveTextContent("CO1.PCCNTR.1");
  });
});
