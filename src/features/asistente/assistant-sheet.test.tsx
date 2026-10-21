// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
import type { PageContext } from "@/infrastructure/ai/page-context";
import { useChatStore } from "@/stores/chat.store";
import { AssistantSheet } from "./assistant-sheet";
import { ChatRuntimeProvider } from "./chat-runtime";
import { PageContextProvider, useRegisterPageContext } from "./page-context";

const summary: PageContext = { route: "/contratacion", title: "Contratación", keyNumbers: [{ label: "Contratos a la vista", value: "4" }] };

function Screen() {
  useRegisterPageContext(summary);
  return null;
}

const done = () =>
  new Response(
    [{ type: "start" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Listo" }, { type: "text-end", id: "t" }, { type: "finish" }]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n",
    { status: 200, headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } },
  );

beforeEach(() => {
  window.localStorage.clear();
  useChatStore.setState({ conversations: [], activeId: null, sheetActiveId: null, sheetOpen: false, webSearch: true });
  push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssistantSheet", () => {
  it("shows what the user is viewing and sends the page context in sheet mode", async () => {
    const fetchMock = vi.fn(async () => done());
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <PageContextProvider>
        <Screen />
        <AssistantSheet />
      </PageContextProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Asistente" }));
    expect(await screen.findByText("Viendo: Contratación")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Mensaje para el asistente" }), "¿Cuántos contratos hay?{Enter}");
    expect(await screen.findByText("Listo")).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.mode).toBe("sheet");
    expect(body.pageContext).toEqual(summary);
    expect(useChatStore.getState().conversations[0].mode).toBe("sheet");
  });

  it("says it cannot see the screen when none registered a summary", async () => {
    const user = userEvent.setup();
    render(
      <PageContextProvider>
        <AssistantSheet />
      </PageContextProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    expect(await screen.findByText("No veo datos de esta pantalla.")).toBeInTheDocument();
  });

  const conv = (id: string, title: string, updatedAt: string) => ({
    id,
    title,
    mode: "sheet" as const,
    createdAt: updatedAt,
    updatedAt,
    messages: [
      { id: `u${id}`, role: "user" as const, parts: [{ type: "text" as const, text: `Pregunta ${title}` }] },
      { id: `a${id}`, role: "assistant" as const, parts: [{ type: "text" as const, text: `Respuesta ${title}` }] },
    ],
    feedback: {},
  });
  const seed = () =>
    useChatStore.setState({
      conversations: [conv("1", "Vieja", "2026-10-18T10:00:00.000Z"), conv("2", "Reciente", "2026-10-19T10:00:00.000Z")],
    });
  const renderSheet = () =>
    render(
      <ChatRuntimeProvider>
        <PageContextProvider>
          <AssistantSheet />
        </PageContextProvider>
      </ChatRuntimeProvider>,
    );

  it("switches to a previous conversation from the Historial menu, latest first, with the current one checked", async () => {
    seed();
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    expect(await screen.findByText("Respuesta Reciente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Historial" }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([expect.stringContaining("Reciente"), expect.stringContaining("Vieja")]);
    expect(items[0]).toHaveAttribute("aria-checked", "true");

    await user.click(items[1]);
    expect(await screen.findByText("Respuesta Vieja")).toBeInTheDocument();
    expect(useChatStore.getState().sheetActiveId).toBe("1");
  });

  it("starts a new conversation from the menu", async () => {
    seed();
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    await user.click(await screen.findByRole("button", { name: "Historial" }));
    await user.click(await screen.findByRole("menuitem", { name: "Nueva conversación" }));
    expect(await screen.findByLabelText("Mensaje para el asistente")).toBeInTheDocument();
    expect(screen.queryByText("Respuesta Reciente")).toBeNull();
  });

  it("opens the same conversation in the full page", async () => {
    seed();
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    await user.click(await screen.findByRole("button", { name: "Historial" }));
    await user.click(await screen.findByRole("menuitem", { name: "Abrir en página completa" }));
    expect(push).toHaveBeenCalledWith("/asistente?c=2");
    expect(useChatStore.getState().sheetOpen).toBe(false);
  });

  it("deletes the current conversation from the menu", async () => {
    seed();
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    await user.click(await screen.findByRole("button", { name: "Historial" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar conversación" }));
    await waitFor(() => expect(useChatStore.getState().conversations.map((c) => c.id)).toEqual(["1"]));
    expect(await screen.findByText("Respuesta Vieja")).toBeInTheDocument();
  });

  it("keeps the panel open, the conversation and an in-flight answer when the user changes screen", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    const chunk = (event: unknown) => controller.enqueue(encoder.encode(`data: ${typeof event === "string" ? event : JSON.stringify(event)}

`));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) }), {
            status: 200,
            headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
          }),
      ),
    );

    // The shell and the runtime stay; the sheet itself is unmounted (the header hides it on /asistente) and mounted again.
    const tree = (showSheet: boolean) => (
      <ChatRuntimeProvider>
        <PageContextProvider>{showSheet && <AssistantSheet />}</PageContextProvider>
      </ChatRuntimeProvider>
    );
    const user = userEvent.setup();
    const view = render(tree(true));
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    await user.type(await screen.findByLabelText("Mensaje para el asistente"), "Pregunta larga{Enter}");
    await waitFor(() => expect(controller).toBeDefined());
    chunk({ type: "start" });
    chunk({ type: "text-start", id: "t" });
    chunk({ type: "text-delta", id: "t", delta: "Primera parte. " });
    expect(await screen.findByText(/Primera parte/)).toBeInTheDocument();
    const id = useChatStore.getState().sheetActiveId;

    view.rerender(tree(false));
    expect(screen.queryByText(/Primera parte/)).toBeNull();
    view.rerender(tree(true));
    // Still open, same conversation, and what had streamed so far is there.
    expect(await screen.findByText(/Primera parte/)).toBeInTheDocument();
    expect(useChatStore.getState().sheetActiveId).toBe(id);

    chunk({ type: "text-delta", id: "t", delta: "Segunda parte." });
    chunk({ type: "text-end", id: "t" });
    chunk({ type: "finish" });
    chunk("[DONE]");
    controller.close();

    expect(await screen.findByText(/Segunda parte/)).toBeInTheDocument();
    await waitFor(() => expect(useChatStore.getState().conversations.find((c) => c.id === id)?.messages).toHaveLength(2));
    expect(useChatStore.getState().sheetOpen).toBe(true);
  });
});
