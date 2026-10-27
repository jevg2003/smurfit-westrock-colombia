// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";
import { ENTER_HREF } from "./shared";

// The special buttons paint with WebGL; jsdom has none, and the component handles that by doing nothing.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LandingPage", () => {
  it("has exactly one h1", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("sends the primary call to action to the app", () => {
    render(<LandingPage />);
    const cta = screen.getAllByRole("link", { name: "Entrar a Smart Work Core" });
    expect(cta.length).toBeGreaterThan(0);
    for (const link of cta) expect(link).toHaveAttribute("href", ENTER_HREF);
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

  it("never frames the product as a pilot, MVP, beta or prototype", () => {
    const { container } = render(<LandingPage />);
    expect(container.textContent).not.toMatch(/piloto|MVP|beta|prototipo/i);
  });

  it("links to mecateo.co from the footer", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /by mecateo\.co/ })).toHaveAttribute("href", "https://mecateo.co");
  });

  it("keeps a skip link and the main landmark", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido");
  });

  it("explains the flow from sources to written signals", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 2, name: /ruido/i })).toBeInTheDocument();
    expect(screen.getAllByText(/SECOP II/).length).toBeGreaterThan(0);
  });

  it("makes no network request while rendering", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LandingPage />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("explains each company profile as a folder instead of decorative symbols", () => {
    render(<LandingPage />);
    const section = screen.getByRole("region", { name: /Se configura para tu empresa/ });
    expect(section.querySelectorAll("svg")).toHaveLength(0);
    for (const name of ["Empaques del Caribe", "Agroindustria del Valle", "Transporte Andino"]) {
      expect(within(section).getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(within(section).getByText(/Datos de ejemplo/)).toBeInTheDocument();
  });

  it("shows the rules step of the flow as work in progress that ends done", () => {
    render(<LandingPage />);
    const flow = screen.getByRole("heading", { level: 3, name: "Lo que sale" }).closest(".swc-flow");
    expect(flow).not.toBeNull();
    expect(within(flow as HTMLElement).getAllByText("Aplicando reglas").length).toBeGreaterThan(0);
    expect(within(flow as HTMLElement).getAllByText("Reglas aplicadas").length).toBeGreaterThan(0);
  });

  it("draws the hero from the shared wordmark and keeps its accessible name", () => {
    render(<LandingPage />);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section") as HTMLElement;
    expect(within(hero).getByRole("img", { name: "Smart Work Core" })).toBeInTheDocument();
    expect(hero.querySelectorAll(".swc-hero-mark path")).toHaveLength(3);
  });

  it("keeps the hero and closing calls to action as links to the same place as the header one", () => {
    render(<LandingPage />);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section") as HTMLElement;
    const header = within(screen.getByRole("banner")).getByRole("link", { name: "Entrar a Smart Work Core" });
    expect(within(hero).getByRole("link", { name: "Entrar a Smart Work Core" })).toHaveAttribute("href", header.getAttribute("href"));
    const special = document.querySelectorAll("a.specular-button");
    expect(special).toHaveLength(2);
    for (const link of special) expect(link).toHaveAttribute("href", header.getAttribute("href"));
  });
});
