// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterSelect } from "./filter-select";
import { useFilterValues } from "./use-filter-values";

afterEach(cleanup);

const OPTIONS = [
  { value: "alert", label: "Alerta" },
  { value: "watch", label: "Vigilar" },
];

describe("FilterSelect", () => {
  it("shows its name, a Todos option and reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<FilterSelect label="Gravedad" value="" options={OPTIONS} onChange={onChange} />);

    const select = screen.getByRole("combobox", { name: "Gravedad" });
    expect(screen.getByRole("option", { name: "Todos" })).toBeInTheDocument();
    await userEvent.selectOptions(select, "watch");

    expect(onChange).toHaveBeenCalledWith("watch");
  });

  it("lets a screen name the empty option", () => {
    render(<FilterSelect label="Estado" value="" options={OPTIONS} onChange={vi.fn()} allLabel="Nuevos y revisados" />);

    expect(screen.getByRole("option", { name: "Nuevos y revisados" })).toBeInTheDocument();
  });
});

describe("useFilterValues", () => {
  it("starts inactive, tracks applied filters and clears them all", () => {
    const { result } = renderHook(() => useFilterValues({ severity: "", topic: "" }));
    expect(result.current.active).toBe(false);

    act(() => result.current.set("severity", "alert"));
    expect(result.current.values).toEqual({ severity: "alert", topic: "" });
    expect(result.current.active).toBe(true);

    act(() => result.current.clear());
    expect(result.current.values).toEqual({ severity: "", topic: "" });
    expect(result.current.active).toBe(false);
  });

  it("counts a value equal to its default as not applied", () => {
    const { result } = renderHook(() => useFilterValues({ state: "open" }));

    expect(result.current.active).toBe(false);
    act(() => result.current.set("state", "dismissed"));
    expect(result.current.active).toBe(true);
  });
});
