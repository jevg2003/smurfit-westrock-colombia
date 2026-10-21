import { expect, test, type Page } from "@playwright/test";

const QUESTION = "¿Cómo se movió la TRM esta semana?";
const ANSWER = "La TRM cerró la semana en 3163,76 COP por USD.";

/** A valid AI SDK UI message stream (SSE, protocol v1) that answers with plain text. */
function uiMessageStream(text: string): string {
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

async function mockChat(page: Page, text = ANSWER) {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/chat", async (route) => {
    bodies.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1", "cache-control": "no-cache" },
      body: uiMessageStream(text),
    });
  });
  return bodies;
}

const composer = (page: Page) => page.getByRole("textbox", { name: "Mensaje para el asistente" });
const send = async (page: Page, text: string) => {
  await composer(page).fill(text);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
};

test.describe("Asistente page", () => {
  test("shows the user message at once, streams the answer and keeps the chat in the history", async ({ page }) => {
    const bodies = await mockChat(page);
    await page.goto("/asistente");

    await send(page, QUESTION);
    const log = page.getByRole("log", { name: "Conversación con el asistente" });
    await expect(log.getByText(QUESTION)).toBeVisible();
    await expect(log.getByText(ANSWER)).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ mode: "page" });

    // Local persistence: after a reload the conversation is listed in the sidebar and reopens.
    await page.reload();
    const history = page.getByRole("complementary", { name: "Historial de conversaciones" });
    await expect(history.getByText(QUESTION)).toBeVisible();
    await history.getByText(QUESTION).click();
    await expect(page.getByRole("log", { name: "Conversación con el asistente" }).getByText(ANSWER)).toBeVisible();
  });

  test("shows a Spanish error with a retry when the server answers 503", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/chat", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "El asistente no está configurado en este servidor." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: uiMessageStream(ANSWER),
      });
    });
    await page.goto("/asistente");

    await send(page, QUESTION);
    await expect(page.getByText("El asistente no está configurado en este servidor.")).toBeVisible();
    await expect(page.getByRole("log", { name: "Conversación con el asistente" }).getByText(QUESTION)).toBeVisible();

    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText(ANSWER)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeHidden();
  });
});

test.describe("Assistant sheet", () => {
  test("opens from the header, shows the page context and answers", async ({ page }) => {
    const bodies = await mockChat(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Asistente" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/^Viendo: /)).toBeVisible();

    await send(page, QUESTION);
    await expect(dialog.getByText(QUESTION)).toBeVisible();
    await expect(dialog.getByText(ANSWER)).toBeVisible();
    expect(bodies[0]).toMatchObject({ mode: "sheet", pageContext: { route: "/" } });
  });
});

test.describe("Live model", () => {
  test.skip(process.env.E2E_LIVE !== "1", "Set E2E_LIVE=1 to call the real model.");

  test("@live answers a question with the real model", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/asistente");
    await send(page, QUESTION);
    const log = page.getByRole("log", { name: "Conversación con el asistente" });
    await expect(log.getByText(QUESTION)).toBeVisible();
    await expect(log.getByText(/TRM/).nth(1)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeHidden();
  });
});
