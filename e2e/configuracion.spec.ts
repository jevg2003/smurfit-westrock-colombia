import { expect, test, type Page } from "@playwright/test";
import { seedCompany } from "./support";

/** Fails when a click on the button would land on another element (overlay, scroll viewport, clipped bar). */
async function expectClickable(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.click({ trial: true, timeout: 5_000 });
  const covered = await button.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return !(top && (el === top || el.contains(top)));
  });
  expect(covered, `"${name}" is covered by another element`).toBe(false);
}

const profile = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("swc:companies:v1");
    return raw ? (JSON.parse(raw).state.companies[0] as Record<string, unknown>) : null;
  });

test.describe("Configuración guarda los cambios", () => {
  test.beforeEach(async ({ page }) => {
    await seedCompany(page);
  });

  test("Empresa: editar, guardar y avisar", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/configuracion?tab=empresa");
    const sector = page.getByRole("textbox", { name: "Sector" });
    await expect(sector).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

    await sector.fill("Metalmecánico editado");
    await expectClickable(page, "Guardar cambios");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();

    await expect(page.getByText("Cambios guardados")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
    expect(JSON.stringify(await profile(page))).toContain("Metalmecánico editado");
    expect(errors).toEqual([]);
  });

  test("Reglas: umbrales y términos se guardan", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/configuracion?tab=reglas");

    await expect(page.getByText("Umbrales de las reglas")).toBeVisible();
    // Watch threshold does not exceed the alert threshold (2), so the form is valid.
    await page.getByRole("textbox", { name: "Variación diaria de la TRM para vigilar" }).fill("2");
    await expectClickable(page, "Guardar cambios");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

    const terms = page.locator("form", { hasText: "Términos para noticias" });
    const chips = terms.getByPlaceholder("Escriba un término").first();
    await chips.fill("término nuevo");
    await chips.press("Enter");
    await expectClickable(page, "Guardar términos");
    await page.getByRole("button", { name: "Guardar términos", exact: true }).click();
    await expect(page.getByRole("button", { name: "Guardar términos" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("Empresa: guardar funciona en pantalla pequeña", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/configuracion?tab=empresa");
    await page.getByRole("textbox", { name: "Sector" }).fill("Metalmecánico móvil");
    await expectClickable(page, "Guardar cambios");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
  });
});
