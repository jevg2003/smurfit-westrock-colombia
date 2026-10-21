// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";

afterEach(cleanup);

describe("DatePicker", () => {
  it("shows the placeholder, then the date formatted in Spanish", () => {
    const { rerender } = render(<DatePicker id="d" value={undefined} onChange={() => {}} today="2026-10-20" />);
    expect(screen.getByRole("button", { name: "Elegir fecha" })).toBeInTheDocument();

    rerender(<DatePicker id="d" value="2026-12-05" onChange={() => {}} today="2026-10-20" />);
    expect(screen.getByRole("button", { name: /5 de diciembre de 2026/ })).toBeInTheDocument();
  });

  it("selects a preset and reports the day key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker id="d" value={undefined} onChange={onChange} today="2026-10-20" />);

    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(await screen.findByRole("button", { name: "Ayer" }));

    expect(onChange).toHaveBeenCalledWith("2026-10-19");
  });

  it("offers future presets and blocks past days when asked for a review date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker id="d" value={undefined} onChange={onChange} today="2026-10-20" direction="future" />);

    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(await screen.findByRole("button", { name: "En una semana" }));

    expect(onChange).toHaveBeenCalledWith("2026-10-27");
  });

  it("clears an optional date", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<string | undefined>("2026-11-01");
      return <DatePicker id="d" value={value} onChange={setValue} today="2026-10-20" clearable />;
    }
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /1 de noviembre de 2026/ }));
    await user.click(await screen.findByRole("button", { name: "Quitar fecha" }));

    expect(screen.getByRole("button", { name: "Elegir fecha" })).toBeInTheDocument();
  });
});
