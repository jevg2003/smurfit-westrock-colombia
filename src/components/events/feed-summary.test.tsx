// @vitest-environment jsdom
import { LandmarkIcon } from "lucide-react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedSummary } from "./feed-summary";

afterEach(cleanup);

const GROUPS = [
  {
    title: "Por tema",
    selected: "",
    onSelect: vi.fn(),
    options: [
      { value: "macro", label: "Macroeconomía", count: 4 },
      { value: "market", label: "Mercado", count: 6 },
    ],
  },
];

describe("FeedSummary", () => {
  it("shows the total with its label and the counts by group", () => {
    render(<FeedSummary total={10} totalLabel="sin revisar" groups={GROUPS} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("sin revisar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mercado/ })).toHaveTextContent("6");
  });

  it("filters on click and releases the filter when the same option is pressed again", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<FeedSummary total={10} totalLabel="sin revisar" groups={[{ ...GROUPS[0], onSelect }]} />);

    await userEvent.click(screen.getByRole("button", { name: /Mercado/ }));
    expect(onSelect).toHaveBeenLastCalledWith("market");

    rerender(<FeedSummary total={10} totalLabel="sin revisar" groups={[{ ...GROUPS[0], selected: "market", onSelect }]} />);
    expect(screen.getByRole("button", { name: /Mercado/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /Mercado/ }));
    expect(onSelect).toHaveBeenLastCalledWith("");
  });

  it("renders a decorative leading icon only for options that carry one", () => {
    const groups = [{ ...GROUPS[0], options: [{ ...GROUPS[0].options[0], icon: LandmarkIcon }, GROUPS[0].options[1]] }];
    render(<FeedSummary total={10} totalLabel="sin revisar" groups={groups} />);

    const withIcon = screen.getByRole("button", { name: /Macroeconomía/ });
    expect(withIcon.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: /Mercado/ }).querySelector("svg")).toBeNull();
  });

  it("lists facts as links when they have an href", () => {
    render(<FeedSummary total={0} totalLabel="sin revisar" groups={[]} facts={[{ label: "TRM hoy", value: "$ 3.900", href: "/economia?tab=trm" }]} />);

    expect(screen.getByRole("link", { name: /TRM hoy/ })).toHaveAttribute("href", "/economia?tab=trm");
  });
});
