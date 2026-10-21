// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LandingPage", () => {
  it("has exactly one h1", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("sends the primary call to action to /home", () => {
    render(<LandingPage />);
    const cta = screen.getAllByRole("link", { name: "Entrar al monitor" });
    expect(cta.length).toBeGreaterThan(0);
    for (const link of cta) expect(link).toHaveAttribute("href", "/home");
  });

  it("states that the prototype is unofficial", () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Prototipo independiente y no oficial\. Sin relación ni aval de Smurfit Westrock\./).length).toBeGreaterThan(0);
  });

  it("labels the radar mockup as sample data", () => {
    render(<LandingPage />);
    expect(screen.getAllByText("Datos de ejemplo").length).toBeGreaterThan(0);
  });

  it("explains how it works in three steps and lists the sources", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("link", { name: "Cómo funciona" })[0]).toHaveAttribute("href", "#como-funciona");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(10);
    expect(screen.getByText(/datos\.gov\.co/)).toBeInTheDocument();
  });

  it("makes no network request while rendering", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LandingPage />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
