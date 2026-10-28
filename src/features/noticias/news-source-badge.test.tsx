// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NewsSourceBadge } from "./news-source-badge";

describe("NewsSourceBadge", () => {
  afterEach(cleanup);

  it("shows the Google News logo and an accessible 'vía Google News' for Google News items", () => {
    const { container } = render(<NewsSourceBadge outlet="Valora Analitik" via="google-news" />);
    expect(screen.getByText("Valora Analitik")).toBeInTheDocument();
    expect(screen.getByText("vía Google News")).toHaveClass("sr-only");
    expect(container.querySelector("[data-slot='google-news-logo']")).not.toBeNull();
  });

  it("shows the outlet with a generic news icon for direct RSS items", () => {
    const { container } = render(<NewsSourceBadge outlet="Portafolio" via="rss" />);
    expect(screen.getByText("Portafolio")).toBeInTheDocument();
    expect(screen.queryByText("vía Google News")).not.toBeInTheDocument();
    expect(container.querySelector("[data-slot='google-news-logo']")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
