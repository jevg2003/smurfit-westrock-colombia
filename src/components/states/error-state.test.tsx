// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorState } from "./error-state";

afterEach(cleanup);

describe("ErrorState", () => {
  it.each([
    ["rate_limited", "La fuente limitó las consultas."],
    ["network", "Revisa tu conexión"],
    ["schema", "La fuente cambió su formato."],
  ] as const)("adds a hint for the %s kind", (kind, hint) => {
    render(<ErrorState message="Falló." kind={kind} />);
    expect(screen.getByText(new RegExp(hint))).toBeInTheDocument();
  });

  it("adds no hint for an unknown or missing kind", () => {
    render(<ErrorState message="Falló." kind="unknown" />);
    expect(screen.getAllByText(/./, { selector: "p" })).toHaveLength(1);
  });
});
