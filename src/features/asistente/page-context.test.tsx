// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fitsPageContextBudget, type PageContext } from "@/infrastructure/ai/page-context";
import { PageContextProvider, useCurrentPageContext, useRegisterPageContext } from "./page-context";

function Screen({ summary }: { summary: PageContext }) {
  useRegisterPageContext(summary);
  return <p>pantalla</p>;
}

function Reader() {
  const current = useCurrentPageContext();
  return <output>{current ? current.title : "ninguna"}</output>;
}

afterEach(cleanup);

const summary: PageContext = { route: "/senales", title: "Señales", keyNumbers: [{ label: "Total", value: "3" }] };

describe("page context", () => {
  it("exposes what the visible screen registered", () => {
    render(
      <PageContextProvider>
        <Screen summary={summary} />
        <Reader />
      </PageContextProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Señales");
  });

  it("clears the context when the screen unmounts", () => {
    const { rerender } = render(
      <PageContextProvider>
        <Screen summary={summary} />
        <Reader />
      </PageContextProvider>,
    );
    rerender(
      <PageContextProvider>
        <Reader />
      </PageContextProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("ninguna");
  });

  it("does nothing outside a provider", () => {
    render(<Screen summary={summary} />);
    expect(screen.getByText("pantalla")).toBeInTheDocument();
  });

  it("trims rows of an oversized summary until it fits the size budget", () => {
    const huge: PageContext = {
      route: "/",
      title: "Enorme",
      rows: Array.from({ length: 30 }, (_, i) => ({ label: `fila ${i} ${"x".repeat(550)}`, detail: "d".repeat(550) })),
    };
    expect(fitsPageContextBudget(huge)).toBe(false);
    function Fits() {
      const current = useCurrentPageContext();
      return <output>{current && fitsPageContextBudget(current) ? "cabe" : "no cabe"}</output>;
    }
    render(
      <PageContextProvider>
        <Screen summary={huge} />
        <Fits />
      </PageContextProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("cabe");
  });
});
