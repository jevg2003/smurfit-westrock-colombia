// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnswerText } from "./answer-text";

afterEach(cleanup);

describe("AnswerText", () => {
  it("renders http(s) markdown links as safe external links", () => {
    render(<AnswerText text="Fuente: [SECOP II](https://www.datos.gov.co/resource/jbjy-vk9h)" />);
    const link = screen.getByRole("link", { name: "SECOP II" });
    expect(link).toHaveAttribute("href", "https://www.datos.gov.co/resource/jbjy-vk9h");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("never turns a javascript: link into a link", () => {
    render(<AnswerText text="[clic](javascript:alert(1))" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/clic/)).toBeInTheDocument();
  });

  it("links bare URLs, renders bold and lists, and never injects HTML", () => {
    const { container } = render(
      <AnswerText text={"**Hechos**\n- TRM: 4.100\n- Ver https://example.com/x\n\n<img src=x onerror=alert(1)>"} />,
    );
    expect(screen.getByText("Hechos").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "https://example.com/x" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
  });
});
