import { describe, expect, it } from "vitest";
import { classifyErrorKind } from "./source-state";

describe("classifyErrorKind", () => {
  it.each([
    ["SECOP II limitó las consultas.", "rate_limited"],
    ["La respuesta de SECOP II cambió de forma (0.x: required).", "schema"],
    ["La respuesta de exportaciones no es JSON válido.", "schema"],
    ["Exportaciones no devolvió datos.", "empty"],
    ["Fuente desactivada.", "disabled"],
    ["SECOP II no respondió a tiempo.", "network"],
    ["datos.gov.co respondió con el estado 503.", "network"],
    [undefined, "network"],
  ] as const)("%s -> %s", (message, kind) => {
    expect(classifyErrorKind(message)).toBe(kind);
  });
});
