// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListDetailLayout } from "./list-detail-layout";
import { mockViewport } from "./viewport.test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const baseProps = {
  filters: <p>Filtros del listado</p>,
  list: <p>Lista de señales</p>,
  detailLabel: "Detalle del aviso",
};

describe("ListDetailLayout", () => {
  it("shows list and a fixed detail pane side by side on a desktop", () => {
    mockViewport(1280);
    render(<ListDetailLayout {...baseProps} detail={<p>Contenido del detalle</p>} onCloseDetail={vi.fn()} />);

    expect(screen.getByText("Lista de señales")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalle del aviso" })).toHaveTextContent("Contenido del detalle");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks to pick an item when nothing is selected on a desktop", () => {
    mockViewport(1280);
    render(<ListDetailLayout {...baseProps} detail={null} onCloseDetail={vi.fn()} />);

    expect(screen.getByText("Elija un elemento de la lista")).toBeInTheDocument();
  });

  it("shows the suggested detail on a desktop but never opens a Sheet for it on a tablet", () => {
    mockViewport(1280);
    const { unmount } = render(<ListDetailLayout {...baseProps} detail={null} desktopDetail={<p>Primera empresa</p>} onCloseDetail={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Detalle del aviso" })).toHaveTextContent("Primera empresa");
    unmount();

    mockViewport(900);
    render(<ListDetailLayout {...baseProps} detail={null} desktopDetail={<p>Primera empresa</p>} onCloseDetail={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the detail in a Sheet on a tablet and closes it", async () => {
    mockViewport(900);
    const onCloseDetail = vi.fn();
    render(<ListDetailLayout {...baseProps} detail={<p>Contenido del detalle</p>} onCloseDetail={onCloseDetail} />);

    expect(screen.queryByRole("region", { name: "Detalle del aviso" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Contenido del detalle");
    expect(screen.queryByRole("button", { name: "Volver a la lista" })).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(onCloseDetail).toHaveBeenCalled();
  });

  it("keeps the Sheet closed on a tablet until something is selected", () => {
    mockViewport(900);
    render(<ListDetailLayout {...baseProps} detail={null} onCloseDetail={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Elija un elemento de la lista")).not.toBeInTheDocument();
  });

  it("offers Volver a la lista on a phone", async () => {
    mockViewport(390);
    const onCloseDetail = vi.fn();
    render(<ListDetailLayout {...baseProps} detail={<p>Contenido del detalle</p>} onCloseDetail={onCloseDetail} />);

    await userEvent.click(screen.getByRole("button", { name: "Volver a la lista" }));
    expect(onCloseDetail).toHaveBeenCalledTimes(1);
  });
});
