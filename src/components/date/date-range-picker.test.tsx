// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker";

afterEach(cleanup);

describe("DateRangePicker", () => {
  it("applies 'Semana pasada' as the previous Monday-Sunday Bogota week", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Tuesday 2026-10-20 in Bogota.
    render(<DateRangePicker label="Período" value={undefined} onChange={onChange} today="2026-10-20" />);

    await user.click(screen.getByRole("button", { name: /Período/ }));
    await user.click(await screen.findByRole("button", { name: "Semana pasada (lun–dom)" }));

    expect(onChange).toHaveBeenCalledWith({ fromDate: "2026-10-12", toDate: "2026-10-18" });
  });

  it("applies the other period shortcuts", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker label="Período" value={undefined} onChange={onChange} today="2026-10-20" />);

    await user.click(screen.getByRole("button", { name: /Período/ }));
    await user.click(await screen.findByRole("button", { name: "Últimos 7 días" }));
    expect(onChange).toHaveBeenLastCalledWith({ fromDate: "2026-10-14", toDate: "2026-10-20" });

    await user.click(screen.getByRole("button", { name: /Período/ }));
    await user.click(await screen.findByRole("button", { name: "Últimos 12 meses" }));
    expect(onChange).toHaveBeenLastCalledWith({ fromDate: "2025-10-20", toDate: "2026-10-20" });
  });

  it("shows the chosen range in Spanish", () => {
    render(
      <DateRangePicker label="Período" value={{ fromDate: "2026-10-12", toDate: "2026-10-18" }} onChange={() => {}} today="2026-10-20" />,
    );
    expect(screen.getByRole("button", { name: /12 oct 2026 – 18 oct 2026/ })).toBeInTheDocument();
  });

  it("'Personalizado' lets the user pick two days on the calendar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker label="Período" value={undefined} onChange={onChange} today="2026-10-20" />);

    await user.click(screen.getByRole("button", { name: /Período/ }));
    await user.click(await screen.findByRole("button", { name: "Personalizado" }));
    await user.click(await screen.findByRole("button", { name: /, 5 de octubre/ }));
    await user.click(await screen.findByRole("button", { name: /, 9 de octubre/ }));

    expect(onChange).toHaveBeenLastCalledWith({ fromDate: "2026-10-05", toDate: "2026-10-09" });
  });
});
