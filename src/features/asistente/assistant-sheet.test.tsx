// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContext } from "@/infrastructure/ai/page-context";
import { useChatStore } from "@/stores/chat.store";
import { AssistantSheet } from "./assistant-sheet";
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
  useChatStore.setState({ conversations: [], activeId: null });
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

  it("lets the user switch to a previous sheet conversation from the Historial menu", async () => {
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
    useChatStore.setState({
      conversations: [conv("1", "Vieja", "2026-10-18T10:00:00.000Z"), conv("2", "Reciente", "2026-10-19T10:00:00.000Z")],
      activeId: null,
    });
    const user = userEvent.setup();
    render(
      <PageContextProvider>
        <AssistantSheet />
      </PageContextProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Asistente" }));
    expect(await screen.findByText("Respuesta Reciente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Historial" }));
    await user.click(await screen.findByRole("menuitem", { name: /Vieja/ }));
    expect(await screen.findByText("Respuesta Vieja")).toBeInTheDocument();
  });
});
