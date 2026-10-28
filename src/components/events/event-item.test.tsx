// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventItem } from "./event-item";

afterEach(cleanup);

const NOW = new Date("2026-10-27T15:00:00.000Z");
const AT = "2026-10-27T13:00:00.000Z";

describe("EventItem", () => {
  it("shows title, source, topic, relative time, one badge and the why line", () => {
    render(
      <EventItem
        title="El dólar subió 1,8 %"
        source="TRM"
        topic="Mercado"
        at={AT}
        now={NOW}
        badge={{ label: "Alerta", tone: "high" }}
        why="Sus importaciones cuestan más."
      />,
    );

    expect(screen.getByText("El dólar subió 1,8 %")).toBeInTheDocument();
    expect(screen.getByText("TRM")).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText("hace 2 horas")).toHaveAttribute("datetime", AT);
    expect(screen.getByText("Alerta")).toBeInTheDocument();
    expect(screen.getByText("Sus importaciones cuestan más.")).toBeInTheDocument();
  });

  it("omits the why line when there is none instead of filling it", () => {
    render(<EventItem title="Titular" at={AT} now={NOW} />);

    expect(screen.queryByText(/Por qué le importa/)).not.toBeInTheDocument();
  });

  it("shows the factual detail apart from the why line", () => {
    render(<EventItem title="Titular" at={AT} now={NOW} detail="Cerró en COP 4.120." why="Sus importaciones cuestan más." />);

    expect(screen.getByText("Cerró en COP 4.120.")).toBeInTheDocument();
    expect(screen.getByText("Sus importaciones cuestan más.")).toBeInTheDocument();
  });

  it("renders without a time when the event has no date and shows extra body content", () => {
    render(
      <EventItem title="Fuente sin consulta" now={NOW}>
        <p>Más datos de la fuente</p>
      </EventItem>,
    );

    expect(screen.queryByText(/hace/)).not.toBeInTheDocument();
    expect(document.querySelector("time")).toBeNull();
    expect(screen.getByText("Más datos de la fuente")).toBeInTheDocument();
  });

  it("marks a new event with a text label, not only a dot", () => {
    render(<EventItem title="Nuevo aviso" at={AT} now={NOW} state="new" />);

    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveAttribute("data-state", "new");
  });

  it("offers Revisar and Descartar for a new event and calls them", async () => {
    const onReview = vi.fn();
    const onDismiss = vi.fn();
    render(<EventItem title="Aviso" at={AT} now={NOW} state="new" onReview={onReview} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Revisar: Aviso" }));
    await userEvent.click(screen.getByRole("button", { name: "Descartar: Aviso" }));

    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("offers Marcar como pendiente for a reviewed event, with no Revisar", async () => {
    const onReopen = vi.fn();
    render(<EventItem title="Aviso" at={AT} now={NOW} state="reviewed" onReview={vi.fn()} onReopen={onReopen} />);

    expect(screen.queryByRole("button", { name: "Revisar: Aviso" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como pendiente: Aviso" }));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it("shows a dismissed event with the Descartado badge in place of the severity and no actions", () => {
    render(
      <EventItem
        title="Aviso"
        at={AT}
        now={NOW}
        state="dismissed"
        badge={{ label: "Alerta", tone: "high" }}
        onReview={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("Descartado")).toBeInTheDocument();
    expect(screen.queryByText("Alerta")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revisar|Descartar/ })).not.toBeInTheDocument();
  });

  it("opens the detail from the title and marks the selected row", async () => {
    const onOpen = vi.fn();
    render(<EventItem title="Aviso" at={AT} now={NOW} onOpen={onOpen} selected />);

    await userEvent.click(screen.getByRole("button", { name: "Aviso" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("listitem")).toHaveAttribute("aria-current", "true");
  });

  it("links the title to the original only for a safe http url", () => {
    const { rerender } = render(<EventItem title="Noticia" at={AT} now={NOW} href="https://example.com/a" />);
    expect(screen.getByRole("link", { name: /Noticia/ })).toHaveAttribute("href", "https://example.com/a");

    rerender(<EventItem title="Noticia" at={AT} now={NOW} href="javascript:alert(1)" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(within(screen.getByRole("listitem")).getByText("Noticia")).toBeInTheDocument();
  });

  it("renders the media slot at the leading edge and keeps the new dot", () => {
    render(<EventItem title="Con ícono" state="new" media={<svg data-testid="media" aria-hidden="true" />} />);

    const item = screen.getByRole("listitem");
    expect(within(item).getByTestId("media")).toBeInTheDocument();
    expect(within(item).getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders no media wrapper when media is absent", () => {
    render(<EventItem title="Sin ícono" />);

    expect(screen.getByRole("listitem").querySelector("[data-slot='event-media']")).toBeNull();
  });
});
