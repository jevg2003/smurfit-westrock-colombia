// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "./filter-bar";

afterEach(cleanup);

describe("FilterBar", () => {
  it("is a labeled group with the filters inside", () => {
    render(
      <FilterBar active={false} onClear={vi.fn()}>
        <span>Tema</span>
      </FilterBar>,
    );

    expect(screen.getByRole("group", { name: "Filtros" })).toHaveTextContent("Tema");
  });

  it("keeps Limpiar visible but disabled while no filter is applied", () => {
    render(<FilterBar active={false} onClear={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Limpiar" })).toBeDisabled();
  });

  it("clears every filter at once when one is applied", async () => {
    const onClear = vi.fn();
    render(<FilterBar active onClear={onClear} />);

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
