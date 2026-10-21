// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToolTrace, type ToolPart } from "./tool-trace";

afterEach(cleanup);

const part = (name: string, output: unknown): ToolPart =>
  ({ type: `tool-${name}`, toolCallId: name, state: "output-available", input: {}, output }) as unknown as ToolPart;

describe("ToolTrace", () => {
  it("shows web search as a finished lookup with its page links, not as a failed source", () => {
    render(
      <ToolTrace
        parts={[part("web_search", { action: { type: "search", query: "empaques" }, sources: [{ type: "url", url: "https://medio.test/nota" }] })]}
      />,
    );
    expect(screen.getByText("Busqué en internet")).toBeInTheDocument();
    expect(screen.queryByText("No pude consultar esta fuente.")).toBeNull();
  });

  it.each([
    ["get_news", "Consulté las noticias"],
    ["get_regulation", "Consulté la regulación"],
    ["get_energy_price", "Consulté el precio de la energía"],
  ])("names the %s lookup", (name, label) => {
    render(<ToolTrace parts={[part(name, { status: "ok", data: {} })]} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
