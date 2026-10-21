// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace }),
  usePathname: () => "/asistente",
  useSearchParams: () => nav.params,
}));

import { useChatStore } from "@/stores/chat.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { AssistantPage } from "./assistant-page";

const sse = (...events: unknown[]) =>
  new Response(events.map((event) => `data: ${typeof event === "string" ? event : JSON.stringify(event)}\n\n`).join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
  });

beforeEach(() => {
  nav.params = new URLSearchParams();
  nav.replace.mockClear();
  window.localStorage.clear();
  useChatStore.setState({ conversations: [], activeId: null, sheetActiveId: null, sheetOpen: false, webSearch: true });
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

  it("has a Buscar en internet toggle that is on by default, is saved, and is sent with the message", async () => {
    const fetchMock = vi.fn(async () =>
      sse({ type: "start" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Listo" }, { type: "text-end", id: "t" }, { type: "finish" }, "[DONE]"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AssistantPage />);

    const toggle = await screen.findByRole("button", { name: "Buscar en internet" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Buscar en internet" })).toHaveAttribute("aria-pressed", "false");
    expect(useChatStore.getState().webSearch).toBe(false);

    await user.type(screen.getByLabelText("Mensaje para el asistente"), "hola{Enter}");
    await screen.findByText("Listo");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.webSearch).toBe(false);
    expect(body.thresholds).toEqual({ watchDays: 90, alertDays: 30 });
  });

  it("sends the contract windows the user set in Preferencias", async () => {
    usePreferencesStore.setState({ thresholds: { ...usePreferencesStore.getState().thresholds, contractExpiryWatchDays: 120, contractExpiryAlertDays: 45 } });
    const fetchMock = vi.fn(async () => sse({ type: "start" }, { type: "finish" }, "[DONE]"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AssistantPage />);
    await user.type(await screen.findByLabelText("Mensaje para el asistente"), "contratos{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).thresholds).toEqual({ watchDays: 120, alertDays: 45 });
    usePreferencesStore.getState().reset();
  });

  it("opens the conversation named in ?c= (Abrir en página completa) even when it was started in the side panel", async () => {
    nav.params = new URLSearchParams("c=s1");
    useChatStore.setState({
      conversations: [
        {
          id: "s1",
          title: "Desde el panel",
          mode: "sheet",
          createdAt: "2026-10-19T10:00:00.000Z",
          updatedAt: "2026-10-19T10:05:00.000Z",
          messages: [
            { id: "u", role: "user", parts: [{ type: "text", text: "Pregunta del panel" }] },
            { id: "a", role: "assistant", parts: [{ type: "text", text: "Respuesta del panel" }] },
          ],
          feedback: {},
        },
      ],
    });
    render(<AssistantPage />);
    expect(await screen.findByText("Respuesta del panel")).toBeInTheDocument();
    expect(useChatStore.getState().activeId).toBe("s1");
    expect(nav.replace).toHaveBeenCalledWith("/asistente");
  });
});
