// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventListSkeleton } from "./event-list-skeleton";
import { RegionEmpty } from "./region-empty";
import { SourceNotices } from "./source-notices";

afterEach(cleanup);

describe("EventListSkeleton", () => {
  it("is one labeled status with the shape of the rows", () => {
    render(<EventListSkeleton label="Consultando los avisos" rows={3} />);

    const status = screen.getByRole("status", { name: "Consultando los avisos" });
    expect(status.querySelectorAll("[data-slot=skeleton-row]")).toHaveLength(3);
  });
});

describe("RegionEmpty", () => {
  it("shows a sentence and runs its action", async () => {
    const onAction = vi.fn();
    render(<RegionEmpty title="No hay cambios sin revisar" description="Cambie el período." action={{ label: "Limpiar", onClick: onAction }} />);

    expect(screen.getByText("No hay cambios sin revisar")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("links the action when it has an href", () => {
    render(<RegionEmpty title="Configure su empresa" action={{ label: "Ir al onboarding", href: "/onboarding" }} />);

    expect(screen.getByRole("link", { name: "Ir al onboarding" })).toHaveAttribute("href", "/onboarding");
  });
});

describe("SourceNotices", () => {
  it("names the failing source, says the rest keeps working and retries", async () => {
    const retry = vi.fn();
    render(
      <SourceNotices
        sources={[
          { name: "SECOP II", status: "error", errorMessage: "No respondió a tiempo.", retry },
          { name: "la TRM", status: "ready", isStale: false },
        ]}
      />,
    );

    expect(screen.getByText("No pudimos consultar SECOP II")).toBeInTheDocument();
    expect(screen.getByText(/Los demás datos siguen disponibles/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a single stale line per source", () => {
    render(<SourceNotices sources={[{ name: "la TRM", status: "ready", isStale: true, updatedAt: Date.parse("2026-10-27T12:00:00Z") }]} />);

    expect(screen.getByText(/No pudimos actualizar la TRM/)).toBeInTheDocument();
  });

  it("renders nothing when every source is fine", () => {
    const { container } = render(<SourceNotices sources={[{ name: "la TRM", status: "ready" }]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
