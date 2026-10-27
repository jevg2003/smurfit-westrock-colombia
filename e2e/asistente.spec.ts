import { expect, test, type Page } from "@playwright/test";
import { companyKey, E2E_COMPANY, mockChat, seedCompany, send, STREAM_HEADERS, uiMessageStream } from "./support";

test.beforeEach(async ({ page }) => {
  await seedCompany(page);
});

const QUESTION = "¿Cómo se movió la TRM esta semana?";
const ANSWER = "La TRM cerró la semana en 3163,76 COP por USD.";

test.describe("Asistente page", () => {
  test("shows the user message at once, streams the answer and keeps the chat in the history", async ({ page }) => {
    const bodies = await mockChat(page, ANSWER);
    await page.goto("/asistente");

    await send(page, QUESTION);
    const log = page.getByRole("log", { name: "Conversación con el asistente" });
    await expect(log.getByText(QUESTION)).toBeVisible();
    await expect(log.getByText(ANSWER)).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ mode: "page", company: { name: E2E_COMPANY.name, nit: E2E_COMPANY.nit } });

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
        headers: STREAM_HEADERS,
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
    const bodies = await mockChat(page, ANSWER);
    await page.goto("/home");

    await page.getByRole("button", { name: "Asistente" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/^Viendo: /)).toBeVisible();

    await send(page, QUESTION);
    await expect(dialog.getByText(QUESTION)).toBeVisible();
    await expect(dialog.getByText(ANSWER)).toBeVisible();
    expect(bodies[0]).toMatchObject({ mode: "sheet", pageContext: { route: "/home" } });
  });
});

const log = (page: Page) => page.getByRole("log", { name: "Conversación con el asistente" });
const PROCESS_URL = "https://community.secop.gov.co/proceso/CO1.PCCNTR.123";
const CONTRACTS_ANSWER = `Estos contratos vencen pronto:\n\n- EMPRESA EJEMPLO, 72 días, vigilar. [Abrir proceso](${PROCESS_URL})`;

test.describe("Contracts answer", () => {
  test("renders the process link as a safe external anchor", async ({ page }) => {
    await mockChat(page, CONTRACTS_ANSWER);
    await page.goto("/asistente");

    await send(page, "¿Qué contratos vencen pronto?");
    const link = log(page).getByRole("link", { name: "Abrir proceso" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", PROCESS_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  });
});

test.describe("Request body", () => {
  test("carries the user's thresholds and web search, which defaults to on", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({ state: { thresholds: { contractExpiryWatchDays: 45, contractExpiryAlertDays: 10 } }, version: 1 }),
      );
    }, companyKey("preferences"));
    const bodies = await mockChat(page, ANSWER);
    await page.goto("/asistente");

    await expect(page.getByRole("button", { name: "Buscar en internet" })).toHaveAttribute("aria-pressed", "true");
    await send(page, QUESTION);
    await expect(log(page).getByText(ANSWER)).toBeVisible();
    expect(bodies[0]).toMatchObject({ webSearch: true, thresholds: { watchDays: 45, alertDays: 10 } });
  });

  test("sends webSearch=false once toggled off, and the choice survives a reload", async ({ page }) => {
    const bodies = await mockChat(page, ANSWER);
    await page.goto("/asistente");

    const internet = page.getByRole("button", { name: "Buscar en internet" });
    await internet.click();
    await expect(internet).toHaveAttribute("aria-pressed", "false");
    await send(page, QUESTION);
    await expect(log(page).getByText(ANSWER)).toBeVisible();
    expect(bodies[0]).toMatchObject({ webSearch: false });

    await page.reload();
    await expect(page.getByRole("button", { name: "Buscar en internet" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Nueva conversación" }).click();
    await send(page, "Otra pregunta");
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1]).toMatchObject({ webSearch: false });
  });
});

test.describe("Sheet history", () => {
  test("switches between conversations, starts a new one and opens one in the full page", async ({ page }) => {
    const bodies = await mockChat(page, (call) => `Respuesta número ${call + 1}.`);
    await page.goto("/home");
    await page.getByRole("button", { name: "Asistente" }).click();
    const dialog = page.getByRole("dialog");

    await send(page, "Primera pregunta");
    await expect(dialog.getByText("Respuesta número 1.")).toBeVisible();

    await dialog.getByRole("button", { name: "Historial" }).click();
    await page.getByRole("menuitem", { name: "Nueva conversación" }).click();
    await expect(dialog.getByText("Primera pregunta")).toBeHidden();
    await send(page, "Segunda pregunta");
    await expect(dialog.getByText("Respuesta número 2.")).toBeVisible();

    // Both conversations are listed with the current one checked; switch back to the first.
    await dialog.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByRole("menuitemradio", { name: /Segunda pregunta/ })).toBeChecked();
    await page.getByRole("menuitemradio", { name: /Primera pregunta/ }).click();
    await expect(dialog.getByText("Respuesta número 1.")).toBeVisible();
    await expect(dialog.getByText("Respuesta número 2.")).toBeHidden();
    // Picking a radio item keeps the menu open, so "Abrir en página completa" is still reachable.

    // Open the current conversation in the full page: same messages, and the URL is tidied afterwards.
    await page.getByRole("menuitem", { name: "Abrir en página completa" }).click();
    await expect(log(page).getByText("Primera pregunta")).toBeVisible();
    await expect(log(page).getByText("Respuesta número 1.")).toBeVisible();
    await expect(page).toHaveURL(/\/asistente$/);
    expect(bodies).toHaveLength(2);
  });

  test("the full-page link carries the conversation id as ?c=<id>", async ({ page }) => {
    await mockChat(page, ANSWER);
    await page.goto("/home");
    await page.getByRole("button", { name: "Asistente" }).click();
    const dialog = page.getByRole("dialog");
    await send(page, QUESTION);
    await expect(dialog.getByText(ANSWER)).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? "", companyKey("chats")))
      .toContain(ANSWER);
    const id = await page.evaluate((key) => {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as { state?: { conversations?: Array<{ id: string }> } };
      return saved.state?.conversations?.[0]?.id ?? "";
    }, companyKey("chats"));
    expect(id).not.toBe("");

    const requested = page.waitForRequest((request) => request.url().includes("/asistente?c=") || request.url().includes("/asistente?_rsc") );
    await dialog.getByRole("button", { name: "Historial" }).click();
    await page.getByRole("menuitem", { name: "Abrir en página completa" }).click();
    await expect(log(page).getByText(ANSWER)).toBeVisible();
    expect((await requested).url()).toContain(id);
  });
});

test.describe("Navigation persistence", () => {
  test("an in-flight answer completes in the open Sheet after changing screen", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await mockChat(page, ANSWER, gate);
    await page.goto("/home");
    await page.getByRole("button", { name: "Asistente" }).click();
    const dialog = page.getByRole("dialog");
    await send(page, QUESTION);
    await expect(dialog.getByText(QUESTION)).toBeVisible();

    // The modal Sheet covers the sidebar, so the link is activated through the DOM (still a client-side navigation).
    await page.locator('a[href="/contratacion"]').first().evaluate((link) => (link as HTMLAnchorElement).click());
    await expect(page).toHaveURL(/\/contratacion$/);
    release();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(ANSWER)).toBeVisible();
  });
});

test.describe("Asistente sidebar", () => {
  test("renames a conversation and deletes it after confirming", async ({ page }) => {
    await mockChat(page, ANSWER);
    await page.goto("/asistente");
    const history = page.getByRole("complementary", { name: "Historial de conversaciones" });
    await expect(history.getByText("Aún no hay conversaciones")).toBeVisible();

    await send(page, QUESTION);
    await expect(log(page).getByText(ANSWER)).toBeVisible();
    await expect(history.getByRole("button", { name: QUESTION, exact: true })).toBeVisible();

    await history.getByRole("button", { name: `Renombrar: ${QUESTION}` }).click();
    const name = history.getByRole("textbox", { name: "Nuevo nombre" });
    await name.fill("Resumen de la TRM");
    await name.press("Enter");
    await expect(history.getByRole("button", { name: "Resumen de la TRM", exact: true })).toBeVisible();

    await history.getByRole("button", { name: "Borrar: Resumen de la TRM" }).click();
    await history.getByRole("button", { name: "Cancelar" }).click();
    await expect(history.getByRole("button", { name: "Resumen de la TRM", exact: true })).toBeVisible();

    await history.getByRole("button", { name: "Borrar: Resumen de la TRM" }).click();
    await history.getByRole("button", { name: "Borrar", exact: true }).click();
    await expect(history.getByText("Aún no hay conversaciones")).toBeVisible();
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
