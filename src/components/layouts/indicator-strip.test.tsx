// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndicatorStrip } from "./indicator-strip";

afterEach(cleanup);

describe("IndicatorStrip", () => {
  it("shows value, name and note of each indicator", () => {
    render(
      <IndicatorStrip
        items={[
          { id: "pib", label: "PIB real", value: "2,64 %", note: "2025" },
          { id: "ipc", label: "Inflación anual", value: "5,14 %" },
        ]}
      />,
    );

    expect(screen.getByText("2,64 %")).toBeInTheDocument();
    expect(screen.getByText("PIB real")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("5,14 %")).toBeInTheDocument();
  });

  it("selects an indicator and marks the active one", async () => {
    const onSelect = vi.fn();
    render(
      <IndicatorStrip
        selected="pib"
        onSelect={onSelect}
        items={[
          { id: "pib", label: "PIB real", value: "2,64 %" },
          { id: "ipc", label: "Inflación anual", value: "5,14 %" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /PIB real/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /Inflación anual/ }));

    expect(onSelect).toHaveBeenCalledWith("ipc");
  });

  it("renders plain text, not buttons, when nothing can be selected", () => {
    render(<IndicatorStrip items={[{ id: "trm", label: "TRM hoy", value: "$ 3.900" }]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a loading shape for a pending indicator", () => {
    render(<IndicatorStrip items={[{ id: "pib", label: "PIB real", value: null, loading: true }]} />);

    expect(screen.getByRole("status", { name: "Consultando PIB real" })).toBeInTheDocument();
  });

  it("says when an indicator has no data", () => {
    render(<IndicatorStrip items={[{ id: "pib", label: "PIB real", value: null }]} />);

    expect(screen.getByText("Sin dato")).toBeInTheDocument();
  });
});
