// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AcercaView } from "./acerca-view";

afterEach(cleanup);

describe("AcercaView", () => {
  it("states that it is an unofficial prototype without endorsement", () => {
    render(<AcercaView />);
    expect(screen.getByText(/sin relación ni aval de Smurfit Westrock/i)).toBeInTheDocument();
  });

  it("covers the sections users need to trust the tool", () => {
    render(<AcercaView />);
    for (const title of ["Qué es y qué no es", "Cómo se calculan las señales", "Cómo se usa la IA", "Licencias de los datos", "Privacidad"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("lists the data licenses and the privacy promises", () => {
    render(<AcercaView />);
    expect(screen.getAllByText(/CC BY-SA 4.0/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CC BY 4.0/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ley 1581/)).toBeInTheDocument();
    expect(screen.getByText(/No hay cuenta/i)).toBeInTheDocument();
  });

  it("links to the editable thresholds and to the source health screen", () => {
    render(<AcercaView />);
    expect(screen.getByRole("link", { name: "Preferencias" })).toHaveAttribute("href", "/preferencias");
    expect(screen.getByRole("link", { name: "Fuentes" })).toHaveAttribute("href", "/fuentes");
  });
});
