// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoogleNewsLogo } from "./google-news-logo";

describe("GoogleNewsLogo", () => {
  afterEach(cleanup);

  it("is a decorative inline svg by default", () => {
    const { container } = render(<GoogleNewsLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg?.querySelector("path")).not.toBeNull();
  });

  it("forwards svg props", () => {
    const { container } = render(<GoogleNewsLogo className="size-3.5" />);
    expect(container.querySelector("svg")).toHaveClass("size-3.5");
  });
});
