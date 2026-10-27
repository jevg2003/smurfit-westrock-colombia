// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentLayout } from "./document-layout";
import { FeedLayout } from "./feed-layout";
import { IndicatorsLayout } from "./indicators-layout";

afterEach(cleanup);

describe("FeedLayout", () => {
  it("puts filters outside the scrolling list and the aside in its own region", () => {
    render(
      <FeedLayout filters={<p>Filtros</p>} aside={<p>12 sin revisar</p>} asideLabel="Resumen">
        <p>Eventos</p>
      </FeedLayout>,
    );

    const list = screen.getByRole("region", { name: "Lista de eventos" });
    expect(list).toHaveTextContent("Eventos");
    expect(list).not.toHaveTextContent("Filtros");
    expect(screen.getByRole("complementary", { name: "Resumen" })).toHaveTextContent("12 sin revisar");
  });

  it("renders without an aside", () => {
    render(
      <FeedLayout filters={<p>Filtros</p>}>
        <p>Eventos</p>
      </FeedLayout>,
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});

describe("IndicatorsLayout", () => {
  it("shows the strip, the chart and the period events as labeled regions", () => {
    render(<IndicatorsLayout strip={<p>PIB</p>} chart={<p>Serie</p>} events={<p>12 oct</p>} eventsLabel="Eventos del período" />);

    expect(screen.getByRole("region", { name: "Indicadores" })).toHaveTextContent("PIB");
    expect(screen.getByRole("region", { name: "Serie" })).toHaveTextContent("Serie");
    expect(screen.getByRole("region", { name: "Eventos del período" })).toHaveTextContent("12 oct");
  });
});

describe("DocumentLayout", () => {
  it("renders an index only when sections are given and links to them", () => {
    render(
      <DocumentLayout
        index={[
          { id: "resumen", label: "Resumen" },
          { id: "cambios", label: "Cambios" },
        ]}
      >
        <p>Texto</p>
      </DocumentLayout>,
    );

    expect(screen.getByRole("navigation", { name: "Contenido" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cambios" })).toHaveAttribute("href", "#cambios");
  });

  it("has no index without sections", () => {
    render(
      <DocumentLayout>
        <p>Texto</p>
      </DocumentLayout>,
    );

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
