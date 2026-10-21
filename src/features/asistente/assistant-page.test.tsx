// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/stores/chat.store";
import { AssistantPage } from "./assistant-page";

const sse = (...events: unknown[]) =>
  new Response(events.map((event) => `data: ${typeof event === "string" ? event : JSON.stringify(event)}\n\n`).join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
  });

beforeEach(() => {
  window.localStorage.clear();
  useChatStore.setState({ conversations: [], activeId: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssistantPage", () => {
  it("shows start suggestions and the disclaimer, and no resume list when there is no history", async () => {
    render(<AssistantPage />);
    expect(await screen.findByRole("button", { name: "¿Qué contratos vencen pronto?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compara a los competidores" })).toBeInTheDocument();
    expect(screen.getByText("La IA puede equivocarse. Verifica las fuentes.")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay conversaciones")).toBeInTheDocument();
  });

  it("lists previous conversations in the history sidebar and resumes one", async () => {
    useChatStore.setState({
      conversations: [
        {
          id: "a",
          title: "Contratos de la semana",
          mode: "page",
          createdAt: "2026-10-19T10:00:00.000Z",
          updatedAt: "2026-10-19T10:05:00.000Z",
          messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "Contratos de la semana" }] }],
          feedback: {},
        },
      ],
    });
    render(<AssistantPage />);
    const history = await screen.findByRole("complementary", { name: "Historial de conversaciones" });
    await userEvent.click(within(history).getByRole("button", { name: "Contratos de la semana" }));
    expect(await screen.findByRole("log", { name: "Conversación con el asistente" })).toBeInTheDocument();
    expect(useChatStore.getState().activeId).toBe("a");
  });

  it("sends a suggestion in page mode without page context and streams the answer with a source link", async () => {
    const fetchMock = vi.fn(async () =>
      sse(
        { type: "start" },
        { type: "start-step" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "La TRM subió. Fuente: [datos.gov.co](https://www.datos.gov.co/resource/mcec-87by.json)" },
        { type: "text-end", id: "t1" },
        { type: "finish-step" },
        { type: "finish" },
        "[DONE]",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AssistantPage />);

    await user.click(await screen.findByRole("button", { name: "¿Cómo se movió la TRM?" }));

    expect(await screen.findByRole("link", { name: "datos.gov.co" })).toHaveAttribute("href", "https://www.datos.gov.co/resource/mcec-87by.json");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/chat");
    const body = JSON.parse(String(init.body));
    expect(body.mode).toBe("page");
    expect(body.pageContext).toBeUndefined();
    expect(screen.getByRole("button", { name: "Copiar respuesta" })).toBeInTheDocument();
    await waitFor(() => expect(useChatStore.getState().conversations[0].messages.length).toBe(2));
  });

  it("shows a clear error state when the assistant is not configured (503)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "El asistente no está configurado: falta la clave del proveedor de IA en el servidor." }, { status: 503 })),
    );
    const user = userEvent.setup();
    render(<AssistantPage />);
    await user.click(await screen.findByRole("button", { name: "Compara a los competidores" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Asistente no disponible");
    expect(alert).toHaveTextContent("falta la clave");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("opens the history in a drawer from the Historial button (mobile)", async () => {
    useChatStore.setState({
      conversations: [
        {
          id: "a",
          title: "Contratos de la semana",
          mode: "page",
          createdAt: "2026-10-19T10:00:00.000Z",
          updatedAt: "2026-10-19T10:05:00.000Z",
          messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "Contratos de la semana" }] }],
          feedback: {},
        },
      ],
    });
    const user = userEvent.setup();
    render(<AssistantPage />);
    await user.click(await screen.findByRole("button", { name: "Historial" }));
    const drawer = await screen.findByRole("dialog");
    await user.click(within(drawer).getByRole("button", { name: "Contratos de la semana" }));
    expect(useChatStore.getState().activeId).toBe("a");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
