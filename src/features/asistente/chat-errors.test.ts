import { describe, expect, it } from "vitest";
import { describeChatFailure } from "./chat-errors";

describe("describeChatFailure", () => {
  it("shows the server message of a 503 (assistant not configured)", () => {
    const error = new Error(JSON.stringify({ error: "El asistente no está configurado: falta la clave." }));
    expect(describeChatFailure(error)).toEqual({ title: "Asistente no disponible", message: "El asistente no está configurado: falta la clave." });
  });

  it("explains a rate limit", () => {
    const failure = describeChatFailure(new Error("Hay demasiadas consultas en este momento. Espera un poco y vuelve a intentarlo."));
    expect(failure.title).toBe("Demasiadas consultas");
  });

  it("explains a network failure", () => {
    expect(describeChatFailure(new TypeError("Failed to fetch")).title).toBe("Sin conexión");
  });

  it("falls back to a generic message without leaking details", () => {
    expect(describeChatFailure(new Error("boom stack trace"))).toEqual({
      title: "No se pudo responder",
      message: "No pude responder en este momento. Vuelve a intentarlo.",
    });
  });
});

describe("describeChatFailure: expired access session", () => {
  it("tells the user to log in again and flags the re-entry action", async () => {
    const { SessionExpiredError } = await import("./chat-fetch");
    expect(describeChatFailure(new SessionExpiredError())).toEqual({
      title: "Sesión vencida",
      message: "Tu sesión de acceso venció. Vuelve a entrar para seguir.",
      reenter: true,
    });
  });

  it("also recognises the proxy's 401 JSON body", () => {
    const failure = describeChatFailure(new Error(JSON.stringify({ error: "unauthorized" })));
    expect(failure.reenter).toBe(true);
  });
});
