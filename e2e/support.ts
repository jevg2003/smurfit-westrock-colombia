import { expect, type Page } from "@playwright/test";

/** A valid AI SDK UI message stream (SSE, protocol v1) that answers with plain text. */
export function uiMessageStream(text: string): string {
  const chunks = [
    { type: "start" },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    ...text.split(" ").map((word, index) => ({ type: "text-delta", id: "t1", delta: index === 0 ? word : ` ${word}` })),
    { type: "text-end", id: "t1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
  return [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"].join("");
}

export const STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
  "cache-control": "no-cache",
};

export type ChatBody = Record<string, unknown> & {
  mode?: string;
  webSearch?: boolean;
  thresholds?: { watchDays: number; alertDays: number };
  messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>;
};

/**
 * Mocks `/api/chat`. `answer` receives the 0-based call index and the request body, so a test can answer
 * differently per call. `gate`, when given, holds the response until the promise resolves.
 */
export async function mockChat(
  page: Page,
  answer: string | ((call: number, body: ChatBody) => string) = "Respuesta de prueba.",
  gate?: Promise<void>,
) {
  const bodies: ChatBody[] = [];
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON() as ChatBody;
    const call = bodies.length;
    bodies.push(body);
    if (gate) await gate;
    const text = typeof answer === "function" ? answer(call, body) : answer;
    await route.fulfill({ status: 200, headers: STREAM_HEADERS, body: uiMessageStream(text) });
  });
  return bodies;
}

export const composer = (page: Page) => page.getByRole("textbox", { name: "Mensaje para el asistente" });

export async function send(page: Page, text: string) {
  // The dev server hydrates lazily; sending before the chat store is ready would lose the message.
  await expect(page.getByRole("status", { name: "Cargando conversaciones" })).toBeHidden();
  await composer(page).fill(text);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
}
