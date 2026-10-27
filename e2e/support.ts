import { expect, type Page } from "@playwright/test";
import { TEST_COMPANY } from "../src/core/company/test-fixtures";

/** The fictional company every app test works on. */
export const E2E_COMPANY = TEST_COMPANY;

/** localStorage key of a store of the E2E company: `swc:<companyId>:<name>:v1`. */
export const companyKey = (name: string) => `swc:${E2E_COMPANY.id}:${name}:v1`;

/**
 * Saves the E2E company as the active one before the app loads, as if the user had already configured it.
 * Without an active company every app screen shows the "no company" state.
 */
export async function seedCompany(page: Page) {
  await page.addInitScript(
    ([key, company]) => {
      localStorage.setItem(key, JSON.stringify({ state: { companies: [company], activeCompanyId: (company as { id: string }).id }, version: 1 }));
    },
    ["swc:companies:v1", E2E_COMPANY] as const,
  );
}

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
  company?: { name: string; nit?: string };
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
