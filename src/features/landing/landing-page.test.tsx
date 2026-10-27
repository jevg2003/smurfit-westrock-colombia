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
    const cta = screen.getAllByRole("link", { name: "Entrar a Smart Work Core" });
    expect(cta.length).toBeGreaterThan(0);
    for (const link of cta) expect(link).toHaveAttribute("href", "/home");
  });

  it("states that the tool is independent and uses public data", () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Herramienta independiente: usa datos públicos y no reemplaza asesoría financiera, legal ni de compras\./).length).toBeGreaterThan(0);
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
