// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DimensionBadge, SeverityBadge } from "./badges";

afterEach(cleanup);

describe("badges", () => {
  it("SeverityBadge keeps the text label and adds a decorative icon", () => {
    const { container } = render(<SeverityBadge severity="alert" />);

    expect(screen.getByText("Alerta")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("DimensionBadge keeps the text label and adds a decorative icon", () => {
    const { container } = render(<DimensionBadge dimension="market" />);

    expect(container.textContent).not.toBe("");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
