// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

afterEach(cleanup);

describe("ErrorState", () => {
  it.each([
    ["rate_limited", "La fuente limitó las consultas."],
    ["network", "Revise su conexión"],
    ["schema", "La fuente cambió su formato."],
  ] as const)("adds a hint for the %s kind", (kind, hint) => {
    render(<ErrorState message="Falló." kind={kind} />);
    expect(screen.getByText(new RegExp(hint))).toBeInTheDocument();
  });

  it("adds no hint for an unknown or missing kind", () => {
    render(<ErrorState message="Falló." kind="unknown" />);
    expect(screen.getAllByText(/./, { selector: "p" })).toHaveLength(1);
  });

  it("shows the expired-session message and a reload button for the unauthorized kind", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    try {
      const onRetry = vi.fn();
      render(<ErrorState message="La fuente respondió 401." kind="unauthorized" onRetry={onRetry} />);
      expect(screen.getByText("Su sesión de acceso venció. Vuelva a entrar para seguir.")).toBeInTheDocument();
      expect(screen.queryByText("La fuente respondió 401.")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Volver a entrar" }));
      expect(reload).toHaveBeenCalledTimes(1);
      expect(onRetry).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
