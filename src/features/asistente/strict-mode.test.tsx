// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
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

// `next dev` renders in React StrictMode: effects mount, clean up and mount again.
describe("AssistantPage in StrictMode (next dev)", () => {
  it("shows the user message and the streamed answer after the first message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
        return sse(
          { type: "start" },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Respuesta lista" },
          { type: "text-end", id: "t1" },
          { type: "finish" },
          "[DONE]",
        );
      }),
    );
    const user = userEvent.setup();
    render(
      <StrictMode>
        <AssistantPage />
      </StrictMode>,
    );
    await user.type(await screen.findByLabelText("Mensaje para el asistente"), "Hola asistente{Enter}");

    expect(await screen.findByText("Hola asistente")).toBeInTheDocument();
    expect(await screen.findByText("Respuesta lista")).toBeInTheDocument();
    await waitFor(() => expect(useChatStore.getState().conversations[0].messages.length).toBe(2));
  });
});
