// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectableList, SelectableRow } from "./selectable-row";

afterEach(cleanup);

describe("SelectableRow", () => {
  it("selects on click and marks the selected row for assistive technology", async () => {
    const onSelect = vi.fn();
    render(
      <SelectableList label="Competidores">
        <SelectableRow title="Competidora Uno" subtitle="NIT 900000002" badge={{ label: "Competidor", tone: "neutral" }} selected onSelect={onSelect} />
        <SelectableRow title="Competidora Dos" selected={false} onSelect={vi.fn()} />
      </SelectableList>,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-current", "true");
    expect(rows[1]).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Competidor")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Competidora Uno/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders a decorative leading media slot only when given", () => {
    const { container } = render(
      <SelectableList label="Factores">
        <SelectableRow title="Con icono" media={<svg data-testid="icon" aria-hidden="true" />} selected={false} onSelect={vi.fn()} />
        <SelectableRow title="Sin icono" selected={false} onSelect={vi.fn()} />
      </SelectableList>,
    );

    const slots = container.querySelectorAll('[data-slot="row-media"]');
    expect(slots).toHaveLength(1);
    expect(slots[0]).toContainElement(screen.getByTestId("icon"));
    expect(screen.getByRole("button", { name: "Con icono" })).toBeInTheDocument();
  });
});
